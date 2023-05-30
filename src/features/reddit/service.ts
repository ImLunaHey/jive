import type { RedditListResponse, RedditRandomResponse, T3 } from '@app/features/reddit/types';
import { Logger } from '@app/logger';

class Service {
    private logger = new Logger({ service: 'Reddit' });

    resolvePosts(response: RedditRandomResponse | RedditListResponse) {
        const responses = Array.isArray(response) ? response : [response];
        return responses.filter(response => {
            const post = response.data.children.find(child => child.kind === 't3')?.data;
            if (!post) return false;

            // Check if we got an image/gif/video post
            const isGifOrVideo = (post.post_hint === 'link' && (!post.url.endsWith('gif') || post.url.endsWith('gifv') || post.url.endsWith('mp4')));
            const isImage = post.post_hint === 'image';
            return isGifOrVideo || isImage;
        }).map(response => response.data.children.find(child => child.kind === 't3')?.data).filter(Boolean);
    }

    async getRandomRedditPost(tries = 0, list: 'random' | 'hot' | 'top', subreddit = 'cats', limit = 1): Promise<T3 | undefined> {
        // If we have no tries left, return undefined
        if (tries <= 0) return undefined;

        // Log the subreddit we're getting a post from
        this.logger.info(`Getting a random post from /r/${subreddit} [${list}] (${tries} tries left)`);

        // Get a random post from the subreddit
        const redditResponses = await fetch(`https://www.reddit.com/r/${subreddit}/${list}.json?limit=${limit}`).then(response => response.json() as Promise<RedditRandomResponse>);
        const redditPosts = this.resolvePosts(redditResponses);

        // Log the amount of posts we got
        this.logger.info(`Got ${redditPosts.length} posts`);

        // Get a random post
        const post = redditPosts[Math.floor(Math.random() * redditPosts.length)];

        // Log the post we got
        this.logger.info(`Got post ${post?.title} (${post?.url})`);

        // If we didn't get a post, try again
        if (!post) return this.getRandomRedditPost(tries - 1, list, subreddit);
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
        const redditResponses = await fetch(`https://www.reddit.com${resolvedUrl}.json?limit=1`).then(response => response.json() as Promise<RedditRandomResponse>);
        const redditPosts = this.resolvePosts(redditResponses);
        const post = redditPosts[Math.floor(Math.random() * redditPosts.length)];

        // If we didn't get a post, return undefined
        if (!post) return;
        return post;
    }
}

export const service = new Service();
