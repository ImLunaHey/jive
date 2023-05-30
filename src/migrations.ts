/* eslint-disable unicorn/no-process-exit */
import 'dotenv/config';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import {
    Migrator,
    FileMigrationProvider
} from 'kysely';
import { database } from '@app/common/database';

const migrateToLatest = async () => {
    const migrator = new Migrator({
        db: database,
        provider: new FileMigrationProvider({
            fs,
            path,
            migrationFolder: path.resolve('./src/migrations'),
        })
    });

    const { error, results } = await migrator.migrateToLatest();

    if (results) for (const it of results) {
        if (it.status === 'Success') {
            console.log(`migration "${it.migrationName}" was executed successfully`)
        } else if (it.status === 'Error') {
            console.error(`failed to execute migration "${it.migrationName}"`)
        }
    }

    if (error) {
        console.error('failed to migrate');
        console.error(error);
        process.exit(1);
    }

    await database.destroy();
}

void migrateToLatest();
