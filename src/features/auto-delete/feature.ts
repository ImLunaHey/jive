import { database } from '@app/common/database';
import { Logger } from '@app/logger';
import { type ArgsOf, Discord, On } from 'discordx';

@Discord()
export class Feature {
    private logger = new Logger({ service: 'AutoDelete' });

    constructor() {
        this.logger.info('Initialised');
    }

    @On({ event: 'ready' })
    async ready() {
        // Fetch all auto-delete settings
        const autoDeleteChannels = await database
            .selectFrom('auto_deletes')
            .select('id')
            .execute();

        // Check if there are any auto-delete settings
        if (autoDeleteChannels.length === 0) return;

        // TODO: Add startup cleaning
    }

    @On({ event: 'messageCreate' })
    async messageCreate([]: ArgsOf<'messageCreate'>) {
        // // Check if the feature is enabled
        // if (!await isFeatureEnabled('AUTO_DELETE', message.guild?.id)) return;

        // // Skip own messages
        // if (message.author.id === message.client.user?.id) return;

        // // Check if the message is in a guild
        // if (!message.guild) return;

        // // Fetch all auto-delete settings for this channel
        // const autoDeleteChannels = await prisma.autoDelete.findMany({
        //     where: {
        //         // settings: {
        //         //     guild: {
        //         //         id: message.guild.id
        //         //     },
        //         // },

        //         OR: [{
        //             triggerChannelId: message.channel.id
        //         }, {
        //             triggerChannelId: null
        //         }]
        //     }
        // });

        // // Check if there are any auto-delete settings for this channel
        // if (!autoDeleteChannels.length) return;

        // for (const autoDeleteChannel of autoDeleteChannels) {
        //     // Check if message matches trigger
        //     if (!autoDeleteChannel.inverted && autoDeleteChannel.triggerMessage && message.content.trim() !== autoDeleteChannel.triggerMessage) continue;
        //     if (autoDeleteChannel.inverted && autoDeleteChannel.triggerMessage && message.content.trim() === autoDeleteChannel.triggerMessage) continue;

        //     // If we have a reply send it then wait the specified amount of time and then delete the message
        //     if (autoDeleteChannel.replyMessage) {
        //         const reply = await message.reply(autoDeleteChannel.replyMessage).catch(() => {
        //             this.logger.warn('Failed to send reply message to %s', message.id);
        //         });

        //         void sleep(autoDeleteChannel.replyTimeout).then(async () => {
        //             await reply?.delete().catch(() => {
        //                 this.logger.warn('Failed to delete reply message %s', reply?.id);
        //             });
        //         });
        //     }

        //     // If we have a timeout then wait the specified amount of time and then delete the message
        //     void sleep(autoDeleteChannel.timeout).then(async () => {
        //         await message.delete().catch(() => {
        //             this.logger.warn('Failed to delete message %s', message.id);
        //         });
        //     });
        // }
    }
}
