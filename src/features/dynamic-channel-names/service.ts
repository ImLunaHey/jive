import { client } from '@app/client';
import { db } from '@app/common/database';
import { replaceVariablesForGuild } from '@app/common/replace-variables';
import { sleep } from '@app/common/sleep';
import { Logger } from '@app/logger';
import { ChannelType } from 'discord.js';

// NOTE: Add these to the database for luna's lobby
// `✅ {{ guild.roles['965589467832401950'].size }}/{{ guild.roles['927462721933443082'].size }} verified members`
// `💳 {{ guild.roles['927469767680487474'].size }} sellers`

class DynamicChannelNamesService {
    private logger = new Logger({ service: 'DynamicChannelNames' });

    async setChannelNames() {
        // Wait until the client is ready
        while (!client.readyAt) await sleep(1_000);

        // Get the dynamicChannel settings for every guild that it enabled
        const dynamicChannels = await db
            .selectFrom('dynamic_channels')
            .select('guildId')
            .select('channelId')
            .select('template')
            .where('enabled', '=', true)
            .execute();

        // Update all dynamic channel names
        for (const dynamicChannel of dynamicChannels) {
            // Get the guild
            if (!dynamicChannel.guildId) continue;
            const guild = await client.guilds.fetch(dynamicChannel.guildId);

            // Get the channel
            const channel = await guild.channels.fetch(dynamicChannel.channelId);
            if (!channel) continue;

            // Don't update the name if it's the same
            const newName = await replaceVariablesForGuild(dynamicChannel.template, guild);
            if ((channel.type === ChannelType.GuildVoice ? channel.name : channel.name.replace(/\-/g, ' ')) === newName) continue;

            // Update the channel name
            this.logger.info('Updating channel name from "%s" to "%s" in "%s"', channel.name, newName, guild.name);
            await channel.setName(newName);
        }
    }
}

export const dynamicChannelNamesService = new DynamicChannelNamesService();
