import 'dotenv/config';
import { z } from 'zod';

/**
 * Specify your environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 */
const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    LOG_LEVEL: z.enum(['info', 'timer', 'debug', 'warn', 'error']).optional(),
    BOT_TOKEN: z.string().min(55).max(80),
    MAINTENANCE_MODE: z.boolean().optional(),
    OWNER_ID: z.string().min(17).max(19),
    OWNER_GUILD_ID: z.string().min(17).max(19),
    DATABASE_URL: z.string(),
});

const processEnvironment = {
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
    BOT_TOKEN: process.env.BOT_TOKEN,
    MAINTENANCE_MODE: !!process.env.MAINTENANCE_MODE,
    OWNER_ID: process.env.OWNER_ID,
    OWNER_GUILD_ID: process.env.OWNER_GUILD_ID,
    DATABASE_URL: process.env.DATABASE_URL,
} satisfies Parameters<typeof schema.safeParse>[0];

// --------------------------
// Don't touch the part below
// --------------------------
if (!!process.env.SKIP_ENV_VALIDATION == false) {
    const parsed = schema.safeParse(processEnvironment);

    if (parsed.success === false) {
        console.error(
            '❌ Invalid environment variables:',
            parsed.error.flatten().fieldErrors,
        );

        // Only exit if we're not running tests
        if (process.env.NODE_ENV !== 'test') {
            // eslint-disable-next-line unicorn/no-process-exit
            process.exit(1);
        }
    }
}

export const environment = process.env as unknown as z.infer<typeof schema>;
// --------------------------
// Don't touch the part above
// --------------------------