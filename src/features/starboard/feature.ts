import { isFeatureEnabled } from '@app/common/is-feature-enabled';
import { prisma } from '@app/common/prisma-client';
import { globalLogger } from '@app/logger';
import { ChannelType, EmbedBuilder, TextChannel } from 'discord.js';
import { ArgsOf, Discord, On } from 'discordx';

const extension = (attachment: string) => {
    const imageLink = attachment.split(".");
    const typeOfImage = imageLink[imageLink.length - 1];
    const image = /(jpg|jpeg|png|gif)/gi.test(typeOfImage);
    if (!image) return "";
    return attachment;
};

@Discord()
export class Feature {
    private logger = globalLogger.scope('Starboard');

    constructor() {
        this.logger.success('Feature initialized');
    }

    @On({ event: 'messageReactionAdd' })
    async messageReactionAdd([reaction, user]: ArgsOf<'messageReactionAdd'>): Promise<void> {
        if (!await isFeatureEnabled('starboard', reaction.message.guild?.id)) return;

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

        this.logger.info('Reaction added to message', { messageId: reaction.message.id, emoji: reaction.emoji.name, userId: user.id });

        const { message } = reaction;
        if (!message.author) return;

        // Don't count the user's own reaction
        if (message.author?.id === user.id) return;

        // Only count ⭐ reactions
        if (reaction.emoji.name !== "⭐") return;

        // Skip if the message is in a DM
        if (message.channel.type === ChannelType.DM) return;

        // Ignore bots
        if (message.author?.bot) return;

        if (!message.guild?.id) return;

        // Skip if the starboard feature is disabled
        const features = await prisma.features.findFirst({
            where: {
                guild: {
                    id: message.guild.id
                },

            },
            include: {
                starboard: true
            }
        });
        if (!features) return;
        if (!features.starboard.starboardChannelId) return;

        const starChannel = message.guild.channels.cache.get(features.starboard.starboardChannelId) as TextChannel;
        if (!starChannel) return;
        if (starChannel.type !== ChannelType.GuildText) return;

        const fetchedMessages = await starChannel.messages.fetch({ limit: 100 });
        const stars = fetchedMessages.find(m => m.embeds[0].footer?.text.startsWith("⭐") && m.embeds[0].footer.text.endsWith(reaction.message.id));
        if (!stars?.embeds[0].footer) return;
        if (stars) {
            const star = /^\⭐\s([0-9]{1,3})\s\|\s([0-9]{17,20})/.exec(stars.embeds[0].footer.text);
            if (!star) return;
            const foundStar = stars.embeds[0];
            const image = message.attachments.size > 0 ? extension([...message.attachments.values()][0].url) : "";
            const embed = new EmbedBuilder()
                .setColor(foundStar.color)
                .setDescription(foundStar.description)
                .setAuthor({
                    name: message.author.tag,
                    iconURL: message.author.displayAvatarURL()
                })
                .setTimestamp()
                .setFooter({
                    text: `⭐ ${parseInt(star[1]) - 1} | ${message.id}`
                })
                .setImage(image);
            const starMsg = await starChannel.messages.fetch(stars.id);
            await starMsg.edit({ embeds: [embed] });
            if (parseInt(star[1]) - 1 == 0) setTimeout(() => starMsg.delete(), 1000);
        }
    }
}
