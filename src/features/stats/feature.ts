import { service } from '@app/features/stats/service';
import { globalLogger } from '@app/logger';
import { type ArgsOf, Discord, On } from 'discordx';

@Discord()
export class Feature {
    private logger = globalLogger.child({ service: 'Stats' });

    constructor() {
        this.logger.info('Initialised');
    }

    @On({
        event: 'messageCreate'
    })
    onMessageCreate([message]: ArgsOf<'messageCreate'>) {
        if (!message.guild?.id) return;

        this.logger.info('New message', {
            guildId: message.guild?.id,
            channelId: message.channel.id,
        });

        // Record a new message happened
        service.newMessage(message);
    }
}
