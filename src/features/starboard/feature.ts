import { client } from '@app/client';
import { isFeatureEnabled } from '@app/common/is-feature-enabled';
import { prisma } from '@app/common/prisma-client';
import { globalLogger } from '@app/logger';
import { ChannelType, EmbedBuilder, MessageReaction, PartialMessageReaction, PartialUser, TextChannel, User } from 'discord.js';
import { ArgsOf, Discord, On } from 'discordx';
import { outdent } from 'outdent';
import { resolve as resolveMedia } from 'media-extractor';

const extension = (attachment: string) => {
    const imageLink = attachment.split(".");
    const typeOfImage = imageLink[imageLink.length - 1];
    const image = /(jpg|jpeg|png|gif)/gi.test(typeOfImage);
    if (!image) return null;
    return attachment;
};

@Discord()
export class Feature {
    private logger = globalLogger.scope('Starboard');

    constructor() {
        this.logger.success('Feature initialized');
    }

    async isReactionValid(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
        if (!reaction.message.author) return false;

        // Don't count the user's own reaction
        if (reaction.message.author?.id === user.id) return false;

        // Only count ⭐ reactions
        if (reaction.emoji.name !== "⭐") return false;

        // Skip if the message is in a DM
        if (reaction.message.channel.type === ChannelType.DM) return false;

        // Ignore bots
        if (reaction.message.author?.bot) return false;

        // Skip embeds
        // @TODO: Add support for embeds
        if (reaction.message.embeds.length > 0) return false;

        // Skip private threads
        if (reaction.message.channel.type === ChannelType.PrivateThread) return false;

        // Reaction is valid
        return true;
    }

    @On({ event: 'messageReactionAdd' })
    async messageReactionAdd([reaction, user]: ArgsOf<'messageReactionAdd'>): Promise<void> {
        this.logger.info('%s added a %s reaction in %s', user.tag, reaction.emoji.name, (reaction.message.channel as TextChannel).name);

        // Check if the starboard feature is enabled
        if (!await isFeatureEnabled('starboard', reaction.message.guild?.id)) return;

        // Skip if the message is in a DM
        if (!reaction.message.guild) return;

        // Check if the reaction is a partial
        if (reaction.partial) {
            // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
            try {
                await reaction.fetch();
            } catch (error) {
                this.logger.error('Something went wrong when fetching the message:', error);
                // Return as `reaction.message.author` may be undefined/null
                return;
            }
        }

        // Check if the message author is a partial
        if (!reaction.message.author) return;

        // Check if the reaction is valid
        if (!await this.isReactionValid(reaction, user)) return;

        // Skip if the starboard isn't setup
        const features = await prisma.features.findFirst({
            where: {
                guild: {
                    id: reaction.message.guild.id
                },

            },
            include: {
                starboard: true
            }
        });
        if (!features) return;
        if (!features.starboard.starboardChannelId) return;

        // Get the starboard channel
        const starChannel = reaction.message.guild.channels.cache.get(features.starboard.starboardChannelId) as TextChannel;
        if (!starChannel) return;
        if (starChannel.type !== ChannelType.GuildText) return;

        // Log
        this.logger.info('Adding a starboard message for %s with a reaction of %s', reaction.message.id, reaction.emoji.name);

        // Fetch the messages in the starboard channel
        const fetchedMessages = await starChannel.messages.fetch({ limit: 100 });

        // Find the starboard message
        const starboardMessage = fetchedMessages.find(message =>
            message.author.id === client.user!.id &&
            message.content.startsWith("⭐") &&
            message.embeds[0].description?.includes(reaction.message.url)
        );

        // If there's already a starboard message, edit it
        if (starboardMessage) {
            const star = /^\⭐\s([0-9]{1,3})\s\|\s([0-9]{17,20})/.exec(starboardMessage.embeds[0].footer?.text ?? '');
            const starCount = parseInt(star![1], 10) + 1;
            const foundStar = starboardMessage.embeds[0];
            const image = reaction.message.attachments.size > 0 ? extension([...reaction.message.attachments.values()][0].url) : "";
            const embed = new EmbedBuilder()
                .setColor(foundStar.color)
                .setDescription(foundStar.description)
                .setAuthor({
                    name: reaction.message.author.tag,
                    iconURL: reaction.message.author.displayAvatarURL(),
                })
                .setTimestamp()
                .setFooter({
                    text: reaction.message.id,
                });
            if (image) embed.setImage(image);
            await starboardMessage.edit({ content: `**⭐ ${starCount}** | <#${reaction.message.channel.id}>`, embeds: [embed] });
        }

        // If there's no starboard message, create one
        if (!starboardMessage) {
            const image = reaction.message.attachments.size > 0 ? extension([...reaction.message.attachments.values()][0].url) : "";
            const embed = new EmbedBuilder()
                .setColor(15844367)
                .setDescription(outdent`
                    **[Jump to message](${reaction.message.url})**

                    ${reaction.message.cleanContent?.startsWith('https://tenor.com') ? resolveMedia(reaction.message.cleanContent) : reaction.message.content}
                `)
                .setAuthor({
                    name: reaction.message.author.tag,
                    iconURL: reaction.message.author.displayAvatarURL(),
                })
                .setTimestamp(new Date())
                .setFooter({
                    text: reaction.message.id,
                });
            if (image) embed.setImage(image);
            await starChannel.send({ content: `**⭐ 1** | <#${reaction.message.channel.id}>`, embeds: [embed] });
        }
    }

    @On({ event: 'messageReactionRemove' })
    async messageReactionRemove([reaction, user]: ArgsOf<'messageReactionAdd'>): Promise<void> {
        this.logger.info('%s removed a %s reaction from %s', user.tag, reaction.emoji.name, (reaction.message.channel as TextChannel).name);

        // Check if the starboard feature is enabled
        if (!await isFeatureEnabled('starboard', reaction.message.guild?.id)) return;

        // Skip if the message is in a DM
        if (!reaction.message.guild) return;

        // Check if the reaction is a partial
        if (reaction.partial) {
            // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
            try {
                await reaction.fetch();
            } catch (error) {
                this.logger.error('Something went wrong when fetching the message:', error);
                // Return as `reaction.message.author` may be undefined/null
                return;
            }
        }

        // Check if the message author is a partial
        if (!reaction.message.author) return;

        // Check if the reaction is valid
        if (!await this.isReactionValid(reaction, user)) return;

        // Skip if the starboard isn't setup
        const features = await prisma.features.findFirst({
            where: {
                guild: {
                    id: reaction.message.guild.id
                },

            },
            include: {
                starboard: true
            }
        });
        if (!features) return;
        if (!features.starboard.starboardChannelId) return;

        // Get the starboard channel
        const starChannel = reaction.message.guild.channels.cache.get(features.starboard.starboardChannelId) as TextChannel;
        if (!starChannel) return;
        if (starChannel.type !== ChannelType.GuildText) return;

        // Fetch the messages in the starboard channel
        const fetchedMessages = await starChannel.messages.fetch({ limit: 100 });

        // Find the starboard message
        const starboardMessage = fetchedMessages.find(message =>
            message.author.id === client.user!.id &&
            message.content.startsWith("⭐") &&
            message.embeds[0].description?.includes(reaction.message.url)
        );

        // If there's already a starboard message, edit it
        if (starboardMessage) {
            const star = /^\⭐\s([0-9]{1,3})\s\|\s([0-9]{17,20})/.exec(starboardMessage.content);
            const starCount = parseInt(star![1]) - 1;
            const foundStar = starboardMessage.embeds[0];
            const image = reaction.message.attachments.size > 0 ? extension([...reaction.message.attachments.values()][0].url) : null;
            const embed = new EmbedBuilder()
                .setColor(foundStar.color)
                .setDescription(foundStar.description)
                .setAuthor({
                    name: reaction.message.author.tag,
                    iconURL: reaction.message.author.displayAvatarURL(),
                })
                .setTimestamp()
                .setFooter({
                    text: reaction.message.id,
                });
            if (image) embed.setImage(image);
            await starboardMessage.edit({ content: `⭐ ${starCount} | <#${reaction.message.channel.id}>`, embeds: [embed] });
            if (star?.[1] && parseInt(star[1]) - 1 == 0) setTimeout(() => {
                starboardMessage.delete().catch(() => {
                    this.logger.error('Failed to delete starboard message', starboardMessage.id);
                });
            }, 1000);
        }
    }
}
