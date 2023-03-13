import { RedditResponse, T3 } from '@app/features/reddit/types';
import { globalLogger } from '@app/logger';
import { ApplicationCommandOptionType, ChannelType, Colors, CommandInteraction, TextChannel } from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';
import { z } from 'zod';

const SubredditName = z.string().regex(/^[a-zA-Z0-9_]+$/).min(3).max(21);

@Discord()
export class Feature {
    private logger = globalLogger.scope('Reddit');

    constructor() {
        this.logger.success('Feature initialized');
    }

    async getRandomRedditPost(tries = 0, subreddit?: string): Promise<T3 | undefined> {
        // If we have no tries left, return undefined
        if (tries <= 0) return undefined;

        // Get a random post from the subreddit
        const redditResponses = await fetch(`https://www.reddit.com/r/${subreddit ?? 'cats'}/random.json?limit=1`).then(response => response.json() as Promise<RedditResponse>);
        const redditPosts = (Array.isArray(redditResponses) ? redditResponses : []).filter(response => {
            const post = response.data.children.find(child => child.kind === 't3')?.data;
            if (!post) return false;

            // Check if we got an image/gif/video post
            const isGifOrVideo = (post.post_hint === 'link' && (!post.url.endsWith('gif') || post.url.endsWith('gifv') || post.url.endsWith('mp4')));
            const isImage = post.post_hint === 'image';
            return isGifOrVideo || isImage;
        }).map(response => response.data.children.find(child => child.kind === 't3')?.data);
        const post = redditPosts[0];

        // If we didn't get a post, try again
        if (!post) return this.getRandomRedditPost(tries--, subreddit);
        return post;
    }

    @Slash({
        name: 'reddit',
        description: 'Get a random reddit post',
    })
    async reddit(
        @SlashOption({
            name: 'subreddit',
            description: 'The subreddit to get the post from',
            required: false,
            type: ApplicationCommandOptionType.String,
        }) subreddit: string | undefined,
        @SlashOption({
            name: 'private',
            description: 'Reply with a private message?',
            required: false,
            type: ApplicationCommandOptionType.Boolean,
        }) ephemeral: boolean = false,
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

        // Check if the subreddit is just plain text
        if (subreddit && !SubredditName.safeParse(subreddit).success) {
            await interaction.followUp({
                embeds: [{
                    title: 'Invalid subreddit',
                }]
            });
            return;
        }

        // Get a random post, try 3 times
        const post = await this.getRandomRedditPost(3, subreddit);

        // If we didn't get a post, show an error
        if (!post) {
            await interaction.followUp({
                embeds: [{
                    title: 'No posts found',
                    description: 'Please try a different subreddit',
                }]
            });
            return;
        }

        // If this is a nsfw post
        if (post?.over_18) {
            // Check if the channel is nsfw
            if (interaction.channel.type === ChannelType.GuildText && !interaction.channel.nsfw ||
                interaction.channel.type === ChannelType.PublicThread && !interaction.channel.parent?.nsfw || 
                interaction.channel.type === ChannelType.PrivateThread && !interaction.channel.parent?.nsfw
            ) {
                await interaction.followUp({
                    ephemeral: true,
                    embeds: [{
                        title: 'This is **NOT** a NSFW channel',
                        description: 'Please use this command in a NSFW channel',
                        color: Colors.Red,
                    }]
                });
            }
            return;
        }

        // Reply with the post
        await interaction.followUp({
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
                    text: `👍 ${post.ups} 💬 ${post.num_comments} 🚇 ${post.subreddit_name_prefixed}`,
                },
                description: `[View on Reddit](https://reddit.com${post.permalink})`,
            }]
        });
    }
}