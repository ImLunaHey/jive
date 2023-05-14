import { dynamicChannelNamesService } from '@app/features/dynamic-channel-names/service';
import { Logger } from '@app/logger';
import { Discord, On } from 'discordx';

@Discord()
export class Feature {
    private logger = new Logger({ service: 'DynamicChannelNames' });

    constructor() {
        this.logger.info('Initialised');
    }

    @On({ event: 'ready' })
    async ready(): Promise<void> {
        await dynamicChannelNamesService.setChannelNames();
    }
}