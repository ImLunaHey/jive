import { client } from '@app/client';
import { prisma } from '@app/common/prisma-client';
import { replaceVariablesForGuild } from '@app/common/replace-variables';
import { sleep } from '@app/common/sleep';
import { globalLogger } from '@app/logger';
import { ChannelType } from 'discord.js';

// TODO: Add these to the database for luna's lobby
// `✅ {{ guild.roles['965589467832401950'].size }}/{{ guild.roles['927462721933443082'].size }} verified members`
// `💳 {{ guild.roles['927469767680487474'].size }} sellers`

class DynamicChannelNamesService {
    private logger = globalLogger.scope('DynamicChannelNames');

    async setChannelNames() {
        // Wait until the client is ready
        while (!client.readyAt) await sleep(1_000);

        const dynamicChannels = await prisma.dynamicChannel.findMany({
            include: {
                DynamicChannelNamesSettings: {
                    include: {
                        settings: {
                            include: {
                                guild: true
                            }
                        }
                    }
                }
            }
        });

        // Update all dynamic channel names
        for (const dynamicChannel of dynamicChannels) {
            // Get the guild
            const guildId = dynamicChannel.DynamicChannelNamesSettings?.settings?.guild?.id;
            if (!guildId) continue;
            const guild = await client.guilds.fetch(guildId);

            // Get the channel
            const channel = await guild.channels.fetch(dynamicChannel.channelId);
            if (!channel) continue;

            // Don't update the name if it's the same
            const newName = await replaceVariablesForGuild(dynamicChannel.channelTemplate, guild);
            if ((channel.type === ChannelType.GuildVoice ? channel.name : channel.name.replace(/\-/g, ' ')) === newName) continue;

            // Update the channel name
            this.logger.info('Updating channel name from "%s" to "%s" in "%s"', channel.name, newName, guild.name);
            await channel.setName(newName);
        }
    }
}

export const dynamicChannelNamesService = new DynamicChannelNamesService();
