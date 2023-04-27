import type { RawBuilder } from 'kysely';
import { sql } from 'kysely';

export const json = <T>(value: T): RawBuilder<T> => sql`CAST(${JSON.stringify(value)} AS JSON)`;
