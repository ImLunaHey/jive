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
    MAINTENCE_MODE: z.boolean().optional(),
});

const processEnv = {
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
    BOT_TOKEN: process.env.BOT_TOKEN,
    MAINTENCE_MODE: !!process.env.MAINTENCE_MODE,
} satisfies Parameters<typeof schema.safeParse>[0];

// --------------------------
// Don't touch the part below
// --------------------------
if (!!process.env.SKIP_ENV_VALIDATION == false) {
    const parsed = schema.safeParse(processEnv);

    if (parsed.success === false) {
        console.error(
            '❌ Invalid environment variables:',
            parsed.error.flatten().fieldErrors,
        );

        // Only exit if we're not running tests
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        }
    }
}

export const env = process.env as unknown as z.infer<typeof schema>;
// --------------------------
// Don't touch the part above
// --------------------------