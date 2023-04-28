import { globalLogger } from '@app/logger';
import { Cron, Expression } from '@reflet/cron';
import { service } from '@app/features/stats/service';

export class Jobs {
    private logger = globalLogger.child({ service: 'Stats:Jobs' });

    constructor() {
        this.logger.info('Initialised');
    }

    @Cron.PreventOverlap
    @Cron(Expression.EVERY_30_SECONDS)
    async writeData() {
        await service.writeData();
    }
}