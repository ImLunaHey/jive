import { client } from '@app/client';
import { isFeatureEnabled } from '@app/common/is-feature-enabled';
import { prisma } from '@app/common/prisma-client';
import { globalLogger } from '@app/logger';
import { TextChannel } from 'discord.js';
import { ArgsOf, Discord, On } from 'discordx';
import { outdent } from 'outdent';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Discord()
export class Feature {
    private logger = globalLogger.scope('Welcome');

    constructor() {
        this.logger.success('Feature initialized');
    }

    @On({ event: 'ready' })
    async ready() {
        // Fetch each guild that has this feature enabled
        const guilds = await prisma.guild.findMany({
            where: {
                features: {
                    some: {
                        id: 'welcome',
                    },
                }
            },
            include: {
                features: true,
            }
        });

        for (const guild of guilds) {
            // Fetch the welcome channel
            const channels = await client.guilds.cache.get(guild.id)?.channels.fetch();
            const channelId = JSON.parse(guild.features.find(feature => feature.id === 'welcome')?.data ?? '{}').channelId;
            const welcomeChannel = channels?.find(channel => channel?.id === channelId) as TextChannel | null;
            if (!welcomeChannel) return;

            // Fetch all the messages in the channel
            const messages = await welcomeChannel?.messages.fetch();
            if (!messages) return;

            // Delete all the messages in the channel
            for (const message of messages.values()) {
                // Skip the bot's messages
                if (message.author.bot) continue;
                await message.delete().catch(() => {
                    globalLogger.warn('Failed to delete message %s', message.id);
                });
            }

            // Check if the channel already has it's welcome message
            const lastMessage = messages.last();
            if (lastMessage?.embeds[0]?.title === 'Server Rules') return;

            // Send the embed
            await welcomeChannel.send({
                embeds: [{
                    title: 'Server Rules',
                    description: outdent`
                        1. Treat everyone with respect. Absolutely no harassment, witch hunting, sexism, racism or hate speech will be tolerated.

                        2. No spam or self-promotion (server invites, advertisements etc) without permission from a staff member. This includes DMing fellow members.
                        
                        3. Any and all photos posted on this server MUST be posted with the owners FULL consent. You may be asked by staff for proof of this.
                        
                        4. Any and all posts about selling MUST be in the content for sale category.
                        
                        5. You must have a profile image set. (This does NOT need to be your face or of you).
                        
                        Type \`!agree\` if you agree to follow these rules
                    `,
                    // Light blue
                    color: 0x00b0f4,
                }]
            });
        }
    }

    @On({ event: 'messageCreate' })
    async messageCreate([message]: ArgsOf<'messageCreate'>) {
        // Skip DM messages
        if (!message.guild) return;

        // Skip if the feature is disabled
        if (!isFeatureEnabled(message.guild?.id, 'welcome')) return;

        // Fetch the welcome channel
        const channels = await client.guilds.cache.get(message.guild.id)?.channels.fetch();
        const feature = await prisma.feature.findFirst({
            where: {
                guildId: message.guild.id,
                id: 'welcome',
            }
        });
        const channelId = JSON.parse(feature?.data ?? '{}').channelId;
        const welcomeChannel = channels?.find(channel => channel?.id === channelId) as TextChannel | null;
        if (!welcomeChannel) return;

        // Skip if the message isn't in the welcome channel
        if (message.channel.id !== welcomeChannel.id) return;
        if (message.author.bot) return;

        // If this isn't !agree tell the user
        if (message.content !== '!agree') {
            const reminder = await message.reply('Please type `!agree` to agree to the rules');

            // Delete the reminder after 5 seconds
            void sleep(5_000).then(() => reminder.delete());
        }

        // Delete the message
        await sleep(2_000);
        await message.delete().catch(() => {
            this.logger.warn('Failed to delete message %s', message.id);
        });
    }
}
