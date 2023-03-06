import { client } from '@app/client';
import { isFeatureEnabled } from '@app/common/is-feature-enabled';
import { prisma } from '@app/common/prisma-client';
import { replaceVariablesForMember } from '@app/common/replace-variables';
import { sleep } from '@app/common/sleep';
import { globalLogger } from '@app/logger';
import { WelcomeSettings } from '@prisma/client';
import { GuildMember, TextChannel } from 'discord.js';
import { ArgsOf, Discord, On } from 'discordx';

@Discord()
export class Feature {
    private logger = globalLogger.scope('Welcome');

    constructor() {
        this.logger.success('Feature initialized');
    }

    async welcomeMember(member: GuildMember, settings: WelcomeSettings) {
        // If join channel is set send the welcome message if there is one
        if (settings.joinChannelId) {
            // Fetch the welcome channel
            const channels = client.guilds.cache.get(member.guild.id)?.channels;
            const joinChannel = channels?.cache.get(settings.joinChannelId) as TextChannel | null;
            if (!joinChannel) return;

            // Send the welcome message
            if (settings.joinMessage) {
                const joinMessage = await joinChannel.send({
                    content: await replaceVariablesForMember(settings.joinMessage, member),
                });

                // If joinMessageTimeout is set delete the welcome message after the specified time
                if (settings.joinMessageTimeout !== null) void sleep(settings.joinMessageTimeout).then(async () => {
                    await joinMessage.delete().catch(() => {
                        this.logger.error('Failed to delete welcome message', joinMessage.id);
                    });
                });
            }
        }

        // If DM is set send the welcome message if there is one
        if (settings.joinDm) {
            // Send the welcome message
            if (settings.joinMessage) await member.send({
                content: await replaceVariablesForMember(settings.joinMessage, member),
            });
        }

        // Add the roles
        if (settings.addRoles) {
            for (const role of settings.addRoles) {
                await member.roles.add(role);
            }
        }

        // Remove the roles
        if (settings.removeRoles) {
            for (const role of settings.removeRoles) {
                await member.roles.remove(role);
            }
        }
    }

    @On({ event: 'guildMemberAdd' })
    async guildMemberAdd([member]: ArgsOf<'guildMemberAdd'>) {
        // Check if the feature is enabled
        if (!await isFeatureEnabled('welcome', member.guild.id)) return;

        // Get settings
        const settings = await prisma.welcomeSettings.findFirst({
            where: {
                settings: {
                    guild: {
                        id: member.guild.id
                    }
                }
            }
        });

        // Check if the guild has this feature setup
        if (!settings) return;

        // Welcome the member
        this.welcomeMember(member, settings);
    }

    @On({ event: 'guildMemberUpdate' })
    async guildMemberUpdate([oldMember, newMember]: ArgsOf<'guildMemberUpdate'>) {
        // Check if the feature is enabled
        if (!await isFeatureEnabled('welcome', newMember.guild.id)) return;

        // Get settings
        const settings = await prisma.welcomeSettings.findFirst({
            where: {
                settings: {
                    guild: {
                        id: newMember.guild.id
                    }
                }
            }
        });

        // Check if the guild has this feature setup
        if (!settings) return;

        // If waitUntilGate is true check if the member has passed the guild's membership screening requirements
        if (settings.waitUntilGate && oldMember.pending && !newMember.pending) {
            this.logger.info('Member %s has passed the membership screening requirements', newMember.id);

            // Welcome the member
            this.welcomeMember(newMember, settings);
        }
    }
}
