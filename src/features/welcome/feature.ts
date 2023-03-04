import { client } from '@app/client';
import { logger } from '@app/logger';
import { TextChannel } from 'discord.js';
import { ArgsOf, Discord, On } from 'discordx';
import { outdent } from 'outdent';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Discord()
export class Feature {
    constructor() {
        logger.success('Welcome feature initialized');
    }

    @On({ event: 'ready' })
    async ready() {
        // Fetch the welcome channel
        const channels = await client.guilds.cache.get('927461441051701280')?.channels.fetch();
        const welcomeChannel = channels?.find(channel => channel?.id === '957080215094431804') as TextChannel | null;
        if (!welcomeChannel) return;

        // Fetch all the messages in the channel
        const messages = await welcomeChannel?.messages.fetch();
        if (!messages) return;

        // Delete all the messages in the channel
        for (const message of messages.values()) {
            // Skip the bot's messages
            if (message.author.bot) continue;
            await message.delete();
        }

        // Check if the channel already has it's welcome message
        const lastMessage = messages.last();
        if (lastMessage?.embeds[0]?.title === 'Server Rules') return;

        // Send the embed
        await welcomeChannel.send({
            embeds: [{
                title: 'Server Rules',
                description: outdent`
                    1. Treat everyone with respect. Absolutely no harassment, witch hunting, sexism, racism or hate speech will be tolerated.

                    2. No spam or self-promotion (server invites, advertisements etc) without permission from a staff member. This includes DMing fellow members.
                    
                    3. Any and all photos posted on this server MUST be posted with the owners FULL consent. You may be asked by staff for proof of this.
                    
                    4. Any and all posts about selling MUST be in the content for sale category.
                    
                    5. You must have a profile image set. (This does NOT need to be your face or of you).
                    
                    Type \`!agree\` if you agree to follow these rules
                `,
                // Light blue
                color: 0x00b0f4,
            }]
        });
    }

    @On({ event: 'messageCreate' })
    async messageCreate([message]: ArgsOf<'messageCreate'>) {
        if (message.channel.id !== '957080215094431804') return;
        if (message.author.bot) return;
        await sleep(2_000);
        await message.delete();
    }
}
