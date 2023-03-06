import { globalLogger } from '@app/logger';
import { Cron, Expression } from '@reflet/cron';
import { dynamicChannelNamesService } from '@app/features/dynamic-channel-names/service';

export class Jobs {
    private logger = globalLogger.scope('DynamicChannelNames');

    constructor() {
        this.logger.success('Jobs initialized');
    }

    @Cron.PreventOverlap
    @Cron(Expression.EVERY_10_MINUTES)
    async updateChannelNames() {
        void dynamicChannelNamesService.setChannelNames();
    }
}