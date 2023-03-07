import { client } from '@app/client';
import { sleep } from '@app/common/sleep';
import { globalLogger } from '@app/logger';
import { Colors, TextChannel } from 'discord.js';
import { ArgsOf, Discord, On } from 'discordx';

@Discord()
export class Feature {
    private logger = globalLogger.scope('Void');

    constructor() {
        this.logger.success('Feature initialized');
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
            // Skip the bot's message if it's the void embed
            if (message.author.bot && message.embeds[0].title === 'Void') return;

            // Wait 30 seconds and then delete the message
            void sleep(30_000).then(async () => {
                await message.delete().catch(() => {
                    this.logger.warn('Failed to delete message %s', message.id);
                });
            });
        }

        // Create the embed
        const embed = {
            title: 'Void',
            description: 'This channel is a void. Anything you say here will be deleted after 1 minute, please keep in mind unverified members can access this channel.',
            color: Colors.Purple,
        };

        // Check if the channel is already a void
        const lastMessage = messages.last();
        const isVoidMessage = (
            lastMessage?.embeds[0]?.title === embed.title &&
            lastMessage?.embeds[0]?.description === embed.description &&
            lastMessage?.embeds[0]?.color === embed.color
        );
        if (isVoidMessage) return;

        // Send the embed
        await voidChannel.send({
            embeds: [embed]
        });
    }

    @On({ event: 'messageCreate' })
    async messageCreate([message]: ArgsOf<'messageCreate'>) {
        if (message.channel.id !== '1081483175202660403') return;
        if (message.author.bot && message.embeds[0].title === 'Void') return;
        await sleep(60_000);
        await message.delete().catch(() => {
            this.logger.warn('Failed to delete message %s', message.id);
        });
    }
}
