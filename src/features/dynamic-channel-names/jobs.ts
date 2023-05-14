import { Logger } from '@app/logger';
import { Cron, Expression } from '@reflet/cron';
import { dynamicChannelNamesService } from '@app/features/dynamic-channel-names/service';

export class Jobs {
    private logger = new Logger({ service: 'DynamicChannelNames:Jobs' });

    constructor() {
        this.logger.info('Initialised');
    }

    @Cron.PreventOverlap
    @Cron(Expression.EVERY_10_MINUTES)
    async updateChannelNames() {
        await dynamicChannelNamesService.setChannelNames();
    }
}