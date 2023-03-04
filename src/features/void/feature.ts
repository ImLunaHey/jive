import { client } from '@app/client';
import { logger } from '@app/logger';
import { TextChannel } from 'discord.js';
import { ArgsOf, Discord, On } from 'discordx';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Discord()
export class Feature {
    constructor() {
        logger.success('Void feature initialized');
    }

    @On({ event: 'ready' })
    async ready() {
        // Fetch the void channel
        const channels = await client.guilds.cache.get('927461441051701280')?.channels.fetch();
        const voidChannel = channels?.find(channel => channel?.id === '1081483175202660403') as TextChannel | null;
        if (!voidChannel) return;

        // Fetch all the messages in the channel
        const messages = await voidChannel?.messages.fetch();
        if (!messages) return;

        // Delete all the messages in the channel
        for (const message of messages.values()) {
            // Skip the bot's messages
            if (message.author.bot) continue;
            await message.delete();
        }

        // Check if the channel is already a void
        const lastMessage = messages.last();
        if (lastMessage?.embeds[0]?.title === 'Void') return;

        // Send the embed
        await voidChannel.send({
            embeds: [{
                title: 'Void',
                description: 'This channel is a void. Anything you say here will be deleted after 2 seconds, please keep in mind unverified members can access this channel.',
                color: 0x000000,
            }]
        });
    }

    @On({ event: 'messageCreate' })
    async messageCreate([message]: ArgsOf<'messageCreate'>) {
        if (message.channel.id !== '1081483175202660403') return;
        if (message.author.bot) return;
        await sleep(2_000);
        await message.delete();
    }
}
