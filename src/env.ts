import 'dotenv/config';
import { z } from 'zod';

/**
 * Specify your environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 */
const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    BOT_TOKEN: z.string().min(55).max(80),
});

const processEnv = {
    NODE_ENV: process.env.NODE_ENV,
    BOT_TOKEN: process.env.BOT_TOKEN,
} satisfies Record<keyof z.infer<typeof schema>, string | undefined>;

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

export const env = process.env as z.infer<typeof schema>;
