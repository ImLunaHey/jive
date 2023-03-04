import { client } from '@app/client';
import { globalLogger } from '@app/logger';

class DynamicChannelNamesService {
    private logger = globalLogger.scope('DynamicChannelNames');

    async setChannelNames() {
        const guild = await client.guilds.fetch('927461441051701280');

        // Fetch all members
        await guild.members.fetch();

        // Fetch all channels
        const channels = await guild.channels.fetch().then(channels => channels.filter(channel => channel && ['988738451300036679', '988738402012762152'].includes(channel.id)));
        const sellers = await guild.roles.fetch('927469767680487474').then(role => role?.members.size ?? 0);
        const verified = await guild.roles.fetch('965589467832401950').then(role => role?.members.size ?? 0);
        const members = await guild.roles.fetch('927462721933443082').then(role => role?.members.size ?? 0);

        for (const channel of channels.values()) {
            // Sellers
            if (channel?.id === '988738451300036679') {
                const name = `💳 ${sellers} sellers`;
                if (channel.name !== name) {
                    this.logger.info('Updating channel name from "%s" to "%s"', channel.name, name);
                    await channel.setName(name);
                }
            }

            // Members
            if (channel?.id === '988738402012762152') {
                const name = `✅ ${verified}/${members} verified members`;
                if (channel.name !== name) {
                    this.logger.info('Updating channel name from "%s" to "%s"', channel.name, name);
                    await channel.setName(name);
                }
            }
        }
    }
}

export const dynamicChannelNamesService = new DynamicChannelNamesService();
