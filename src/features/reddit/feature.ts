import { RedditResponse, T3 } from '@app/features/reddit/types';
import { globalLogger } from '@app/logger';
import { ApplicationCommandOptionType, ChannelType, Colors, CommandInteraction } from 'discord.js';
import { Discord, Slash, SlashChoice, SlashOption } from 'discordx';
import { z } from 'zod';

const SubredditName = z.string().regex(/^[a-zA-Z0-9_]+$/).min(3).max(21);

@Discord()
export class Feature {
    private logger = globalLogger.scope('Reddit');

    constructor() {
        this.logger.success('Feature initialized');
    }

    async resolvePosts(posts: RedditResponse) {
        return posts.filter(response => {
            const post = response.data.children.find(child => child.kind === 't3')?.data;
            if (!post) return false;

            // Check if we got an image/gif/video post
            const isGifOrVideo = (post.post_hint === 'link' && (!post.url.endsWith('gif') || post.url.endsWith('gifv') || post.url.endsWith('mp4')));
            const isImage = post.post_hint === 'image';
            return isGifOrVideo || isImage;
        }).map(response => response.data.children.find(child => child.kind === 't3')?.data).filter(Boolean);
    }

    async getRandomRedditPost(tries = 0, list: 'random' | 'hot' | 'top', subreddit: string = 'cats'): Promise<T3 | undefined> {
        // If we have no tries left, return undefined
        if (tries <= 0) return undefined;

        // Get a random post from the subreddit
        const redditResponses = await fetch(`https://www.reddit.com/r/${subreddit}/${list}.json?limit=1`).then(response => response.json() as Promise<RedditResponse>);
        const redditPosts = await this.resolvePosts(redditResponses);
        const post = redditPosts[Math.floor(Math.random() * redditPosts.length)];

        // If we didn't get a post, try again
        if (!post) return this.getRandomRedditPost(tries--, list, subreddit);
        return post;
    }

    resolveRedditUrl(url: string) {
        if (url.startsWith('/r/')) return url;
        if (url.startsWith('/u/')) return url;

        try {
            const urlObject = new URL(url);
            if (urlObject.hostname !== 'reddit.com' && urlObject.hostname !== 'www.reddit.com') throw new Error('Invalid url');
            return urlObject.pathname;
        } catch {
            return url;
        }
    }

    async getRedditPost(url: string) {
        const resolvedUrl = this.resolveRedditUrl(url);

        // Get the post from the url
        const redditResponses = await fetch(`https://www.reddit.com${resolvedUrl}.json?limit=1`).then(response => response.json() as Promise<RedditResponse>);
        const redditPosts = await this.resolvePosts(redditResponses);
        const post = redditPosts[Math.floor(Math.random() * redditPosts.length)];

        // If we didn't get a post, return undefined
        if (!post) return undefined;
        return post;
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

        // Get the post
        const post = url ? await this.getRedditPost(url) : await this.getRandomRedditPost(3, list, subreddit);

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
        if (!ephemeral && post?.over_18) {
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