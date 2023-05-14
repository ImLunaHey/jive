
import { service } from '@app/features/reddit/service';
import { Logger } from '@app/logger';
import { ApplicationCommandOptionType, ChannelType, Colors, CommandInteraction } from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';
import { z } from 'zod';

const SubredditName = z.string().regex(/^[a-zA-Z0-9_]+$/).min(3).max(21);

@Discord()
export class Feature {
    private logger = new Logger({ service: 'Reddit' });

    constructor() {
        this.logger.info('Initialised');
    }

    @Slash({
        name: 'reddit',
        description: 'Get reddit posts',
    })
    async reddit(
        @SlashOption({
            name: 'subreddit',
            description: 'The subreddit to get the post from',
            required: false,
            type: ApplicationCommandOptionType.String,
        }) subreddit: string | undefined,
        @SlashOption({
            name: 'url',
            description: 'The url to get the post from',
            required: false,
            type: ApplicationCommandOptionType.String,
        })
        url: string | undefined,
        @SlashOption({
            name: 'list',
            description: 'The list to get the post from',
            required: false,
            type: ApplicationCommandOptionType.String,
            async autocomplete(interaction) {
                await interaction.respond([{
                    name: 'Random',
                    value: 'random',
                }, {
                    name: 'Hot',
                    value: 'hot',
                }, {
                    name: 'Top',
                    value: 'top',
                }])
            },
        })
        list: 'random' | 'hot' | 'top' = 'random',
        @SlashOption({
            name: 'private',
            description: 'Reply with a private message?',
            required: false,
            type: ApplicationCommandOptionType.Boolean,
        }) ephemeral = false,
        interaction: CommandInteraction
    ) {
        if (!interaction.guild) return;
        if (
            interaction.channel?.type !== ChannelType.GuildText &&
            interaction.channel?.type !== ChannelType.PrivateThread &&
            interaction.channel?.type !== ChannelType.PublicThread
        ) return;

        // Show the bot thinking
        await interaction.deferReply({ ephemeral });

        this.logger.info(`Getting a reddit post for ${interaction.user.tag} (${interaction.user.id})`);
        if (subreddit) this.logger.info(`Subreddit: ${subreddit}`);
        if (url) this.logger.info(`Url: ${url}`);
        if (list) this.logger.info(`List: ${list}`);

        // Check if the subreddit is just plain text
        if (subreddit && !SubredditName.safeParse(subreddit).success) {
            await interaction.editReply({
                embeds: [{
                    title: 'Invalid subreddit',
                }]
            });
            return;
        }

        // Get the post
        const post = url ? await service.getRedditPost(url) : await service.getRandomRedditPost(3, list, subreddit);

        // If we didn't get a post, show an error
        if (!post) {
            this.logger.error('No posts found');
            await interaction.editReply({
                embeds: [{
                    title: 'No posts found',
                    description: 'Please try a different subreddit',
                }]
            });
            return;
        }

        // If this is a nsfw post
        if (!ephemeral && post?.over_18) {
            // Check if the channel is nsfw
            if (interaction.channel.type === ChannelType.GuildText && !interaction.channel.nsfw ||
                interaction.channel.type === ChannelType.PublicThread && !interaction.channel.parent?.nsfw ||
                interaction.channel.type === ChannelType.PrivateThread && !interaction.channel.parent?.nsfw
            ) {
                this.logger.error(`${interaction.channel.type} ${interaction.channel.id} is not a NSFW channel`);

                // Reply with an error
                await interaction.editReply({
                    embeds: [{
                        title: 'This is **NOT** a NSFW channel',
                        description: 'Please use this command in a NSFW channel',
                        color: Colors.Red,
                    }]
                });

                return;
            }
        }

        // Log the post
        this.logger.info(`Sending post ${post.title} (${post.url})`);

        // Reply with the post
        await interaction.editReply({
            embeds: [{
                title: post.title,
                author: {
                    name: `u/${post.author}`,
                    url: `https://reddit.com/u/${post.author}`,
                    icon_url: post.thumbnail,
                },
                image: {
                    url: post.url,
                },
                footer: {
                    text: `👍 ${Intl.NumberFormat('en').format(post.ups)} 💬 ${Intl.NumberFormat('en').format(post.num_comments)} 🚇 ${post.subreddit_name_prefixed}`,
                },
                description: `[View on Reddit](https://reddit.com${post.permalink})`,
            }]
        });
    }
}
