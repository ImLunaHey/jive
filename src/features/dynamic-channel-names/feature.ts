import { dynamicChannelNamesService } from '@app/features/dynamic-channel-names/service';
import { globalLogger } from '@app/logger';
import { Discord, On } from 'discordx';

@Discord()
export class Feature {
    private logger = globalLogger.scope('DynamicChannelNames');

    constructor() {
        this.logger.success('Feature initialized');
    }

    @On({ event: 'ready' })
    async ready(): Promise<void> {
        void dynamicChannelNamesService.setChannelNames();
    }
}