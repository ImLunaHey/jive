import { client } from '@app/client';
import { isFeatureEnabled } from '@app/common/is-feature-enabled';
import { Logger } from '@app/logger';
import type { MessageReaction, PartialMessageReaction, PartialUser, TextChannel, User } from 'discord.js';
import { ChannelType, EmbedBuilder } from 'discord.js';
import { type ArgsOf, Discord, On } from 'discordx';
import { outdent } from 'outdent';
import { sleep } from '@app/common/sleep';
import { database } from '@app/common/database';

const extension = (attachment: string) => {
    const imageLink = attachment.split('.');
    const typeOfImage = imageLink.at(-1);
    if (!typeOfImage) return null;
    const image = /(jpg|jpeg|png|gif)/gi.test(typeOfImage);
    if (!image) return null;
    return attachment;
};

@Discord()
export class Feature {
    private logger = new Logger({ service: 'Starboard' });

    constructor() {
        this.logger.info('Initialised');
    }

    isReactionValid(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
        if (!reaction.message.author) return false;

        // Don't count the user's own reaction
        if (reaction.message.author?.id === user.id) return false;

        // Skip if the message is in a DM
        if (reaction.message.channel.type === ChannelType.DM) return false;

        // Ignore bots
        if (reaction.message.author?.bot) return false;

        // Skip non gifv embeds
        // TODO: Add support for embeds
        if (reaction.message.embeds.length > 0 && reaction.message.embeds[0].data.type !== 'gifv') return false;

        // Skip private threads
        if (reaction.message.channel.type === ChannelType.PrivateThread) return false;

        // Reaction is valid
        return true;
    }

    @On({ event: 'messageReactionAdd' })
    async messageReactionAdd([reaction, user]: ArgsOf<'messageReactionAdd'>): Promise<void> {
        // Check if the starboard feature is enabled
        if (!await isFeatureEnabled('STARBOARD', reaction.message.guild?.id)) return;

        // Skip if the message is in a DM
        if (!reaction.message.guild) return;

        // Fetch the client's details if it hasn't been cached
        const clientUser = client.user?.id ? client.user : await client.user?.fetch();
        if (!clientUser) return;

        // Check if the reaction is a partial
        if (reaction.partial) {
            // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
            try {
                await reaction.fetch();
            } catch (error: unknown) {
                this.logger.error('Something went wrong when fetching the message', { error });
                // Return as `reaction.message.author` may be undefined/null
                return;
            }
        }

        // Check if the message author is a partial
        if (!reaction.message.author) return;

        // Check if the reaction is valid
        if (!this.isReactionValid(reaction, user)) return;

        // Skip if the starboard isn't setup
        const starboards = await database
            .selectFrom('starboards')
            .select('allowedReactions')
            .select('minimumReactions')
            .select('starboardChannelId')
            .where('guildId', '=', reaction.message.guild.id)
            .execute();

        // Check if this guild has any starboards
        if (starboards.length === 0) return;

        // Check that at least one starboard has the reaction enabled
        if (starboards.every(starboard => !starboard.allowedReactions.includes(reaction.emoji.name ?? ''))) return;

        this.logger.info('Member added a new reaction to a message', {
            guildId: reaction.message.guild.id,
            memberId: user.id,
            channelId: reaction.message.channel.id,
            messageId: reaction.message.id,
            emoji: reaction.emoji.id,
        });

        // For each starboard
        for (const starboard of starboards) {
            // Skip if this post doesn't have enough reactions
            if ((reaction.count ?? 0) < starboard.minimumReactions) return;

            // Check if this is a valid emoji reaction
            if (reaction.emoji.name && starboard.allowedReactions.length > 0 && !starboard.allowedReactions.includes(reaction.emoji.name)) return;

            // Get the starboard channel
            const starChannel = reaction.message.guild.channels.cache.get(starboard.starboardChannelId) as TextChannel;
            if (!starChannel) return;
            if (starChannel.type !== ChannelType.GuildText) return;

            // Log
            this.logger.info('Adding a starboard message', {
                guildId: reaction.message.guild.id,
                memberId: user.id,
                channelId: reaction.message.channel.id,
                messageId: reaction.message.id,
                emoji: reaction.emoji.id,
            });

            // Fetch the messages in the starboard channel
            const fetchedMessages = await starChannel.messages.fetch({ limit: 100 });

            // Find the starboard message
            const starboardMessage = fetchedMessages.find(message =>
                message.author.id === clientUser.id &&
                message.content.startsWith('**⭐') &&
                message.embeds[0].description?.includes(reaction.message.url)
            );

            // If there's already a starboard message, edit it
            if (starboardMessage) {
                const starCount = Number(starboardMessage.cleanContent.replaceAll('*', '').split('|')[0].split(' ')[1]) + 1;
                const foundStar = starboardMessage.embeds[0];
                const image = reaction.message.attachments.size > 0 ? extension([...reaction.message.attachments.values()][0].url) : '';
                const embed = new EmbedBuilder()
                    .setColor(foundStar.color)
                    .setDescription(foundStar.description)
                    .setAuthor({
                        name: reaction.message.author.tag,
                        iconURL: reaction.message.author.displayAvatarURL(),
                    })
                    .setTimestamp();
                if (image) embed.setImage(image);
                await starboardMessage.edit({ content: `**⭐ ${starCount}** | <#${reaction.message.channel.id}>`, embeds: [embed] });
            }

            // If there's no starboard message, create one
            if (!starboardMessage) {
                const image = reaction.message.attachments.size > 0 ? extension([...reaction.message.attachments.values()][0].url) : '';
                const tenorGif = reaction.message.cleanContent?.startsWith('https://tenor.com/') ?? false;
                const embed = new EmbedBuilder()
                    .setColor(15_844_367)
                    .setDescription(outdent`
                        **[Jump to message](${reaction.message.url})**

                        ${tenorGif ? '' : reaction.message.content}
                    `)
                    .setAuthor({
                        name: reaction.message.author.tag,
                        iconURL: reaction.message.author.displayAvatarURL(),
                    })
                    .setTimestamp(new Date());
                if (image) embed.setImage(image);
                if (tenorGif && reaction.message.cleanContent) {
                    const resolveMediaUrl = await import('media-extractor').then(m => m.resolveMediaUrl);
                    const mediaLink = await resolveMediaUrl(reaction.message.cleanContent);
                    embed.setImage(mediaLink);
                }
                await starChannel.send({ content: `**⭐ 1** | <#${reaction.message.channel.id}>`, embeds: [embed] });

                // TODO: Add support for pinging the user
                // Ping the user if the feature is enabled
                // if (features.starboard.pingUser) {
                // const reply = await starboardMessage.reply(`<@${reaction.message.author.id}> you made it on the starboard`);
                // // Wait 10 seconds and then delete the message
                // void sleep(10_000).then(async () => {
                //     await reply.delete().catch(() => {
                //         this.logger.warn('Failed to delete message %s', reply.id);
                //     });
                // });
                // }
            }
        }
    }

    @On({ event: 'messageReactionRemove' })
    async messageReactionRemove([reaction, user]: ArgsOf<'messageReactionAdd'>): Promise<void> {
        const guild = reaction.message.guild;

        // Skip if the message is in a DM
        if (!guild) return;

        // Check if the starboard feature is enabled
        if (!await isFeatureEnabled('STARBOARD', guild.id)) return;

        // Fetch the client's details if it hasn't been cached
        const clientUser = client.user?.id ? client.user : await client.user?.fetch();
        if (!clientUser) return;

        // Check if the reaction is a partial
        if (reaction.partial) {
            // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
            try {
                await reaction.fetch();
            } catch (error: unknown) {
                this.logger.error('Something went wrong when fetching the message', { error });
                // Return as `reaction.message.author` may be undefined/null
                return;
            }
        }

        // Check if the message author is a partial
        if (!reaction.message.author) {
            this.logger.info('Message author is a partial');
            return;
        }

        // Check if the reaction is valid
        if (!this.isReactionValid(reaction, user)) return;

        // Skip if the starboard isn't setup
        const starboards = await database
            .selectFrom('starboards')
            .select('allowedReactions')
            .select('starboardChannelId')
            .where('guildId', '=', guild.id)
            .execute();

        // Check if this guild has any starboards
        if (starboards.length === 0) return;

        // Check that at least one starboard has the reaction enabled
        if (starboards.every(starboard => !starboard.allowedReactions.includes(reaction.emoji.name ?? ''))) return;

        // Log
        this.logger.info('Removed a reaction', {
            guildId: guild.id,
            memberId: user.id,
            channelId: reaction.message.channel.id,
            messageId: reaction.message.id,
            emoji: reaction.emoji.id,
        });

        // For each starboard
        for (const starboard of starboards) {

            // Check if this is a valid emoji reaction
            if (reaction.emoji.name && starboard.allowedReactions.length > 0 && !starboard.allowedReactions.includes(reaction.emoji.name)) return;

            // Get the starboard channel
            const starboardChannel = guild.channels.cache.get(starboard.starboardChannelId) as TextChannel;
            if (!starboardChannel) return;
            if (starboardChannel.type !== ChannelType.GuildText) return;

            // Fetch the messages in the starboard channel
            const fetchedMessages = await starboardChannel.messages.fetch({ limit: 100 });

            // Find the starboard message
            const starboardMessage = fetchedMessages.find(message =>
                message.author.id === clientUser.id &&
                message.content.startsWith('**⭐') &&
                message.embeds[0].description?.includes(reaction.message.url)
            );

            // If there's already a starboard message, edit it
            if (starboardMessage) {
                const starCount = Number(starboardMessage.cleanContent.replaceAll('*', '').split('|')[0].split(' ')[1]) - 1;
                const foundStar = starboardMessage.embeds[0];
                const image = reaction.message.attachments.size > 0 ? extension([...reaction.message.attachments.values()][0].url) : null;
                const embed = new EmbedBuilder()
                    .setColor(foundStar.color)
                    .setDescription(foundStar.description)
                    .setAuthor({
                        name: reaction.message.author.tag,
                        iconURL: reaction.message.author.displayAvatarURL(),
                    })
                    .setTimestamp();
                if (image) embed.setImage(image);
                await starboardMessage.edit({ content: `⭐ ${starCount} | <#${reaction.message.channel.id}>`, embeds: [embed] });

                // If the starboard message has no stars, delete it
                if (starCount === 0) {
                    await sleep(1_000);
                    try {
                        await starboardMessage.delete();
                    } catch (error: unknown) {
                        this.logger.error('Failed to delete starboard message', {
                            error,
                            guildId: guild.id,
                            channelId: starboardChannel.id,
                            memberId: user.id,
                            messageId: starboardMessage.id,
                        });
                    }
                }
            }
        }
    }
}
