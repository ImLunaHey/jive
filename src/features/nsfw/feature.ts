import { RedditResponse } from '@app/features/nsfw/types';
import { globalLogger } from '@app/logger';
import { ApplicationCommandOptionType, CommandInteraction, TextChannel } from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';
import { z } from 'zod';

const SubredditName = z.string().regex(/^[a-zA-Z0-9_]+$/).min(3).max(21);

@Discord()
export class Feature {
    private logger = globalLogger.scope('NSFW');

    constructor() {
        this.logger.success('Feature initialized');
    }

    @Slash({
        name: 'nsfw',
        description: 'Get a random NSFW image',
    })
    async nsfw(
        @SlashOption({
            name: 'subreddit',
            description: 'The subreddit to get the image from',
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
        // Check if this is a NSFW channel
        if (!(interaction.channel as TextChannel)?.nsfw) {
            await interaction.reply({
                embeds: [{
                    title: 'This is not a NSFW channel',
                    description: 'Please use this command in a NSFW channel',
                }]
            });
            return;
        }

        // Check if the subreddit is just plain text
        if (subreddit && !SubredditName.safeParse(subreddit).success) {
            await interaction.reply({
                embeds: [{
                    title: 'Invalid subreddit',
                }]
            });
            return;
        }

        // Show the bot thinking
        await interaction.deferReply({ ephemeral });

        // Get a random post
        const redditResponses = await fetch(`https://www.reddit.com/r/${subreddit ?? 'horny'}/random.json?limit=10`).then(response => response.json() as Promise<RedditResponse>);
        const redditPosts = (Array.isArray(redditResponses) ? redditResponses : []).filter(response => {
            const post = response.data.children.find(child => child.kind === 't3')?.data;
            if (!post) return false;

            // Check if we got an image/gif/video post
            const isGifOrVideo = (post.post_hint === 'link' && (!post.url.endsWith('gif') || post.url.endsWith('gifv') || post.url.endsWith('mp4')));
            const isImage = post.post_hint === 'image';
            return isGifOrVideo || isImage;
        }).map(response => response.data.children.find(child => child.kind === 't3')?.data);
        const post = redditPosts[0];

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