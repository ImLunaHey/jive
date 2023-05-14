import { client } from '@app/client';
import { sleep } from '@app/common/sleep';
import { Logger } from '@app/logger';
import type { TextChannel } from 'discord.js';
import { Colors } from 'discord.js';
import { type ArgsOf, Discord, On } from 'discordx';

@Discord()
export class Feature {
    private logger = new Logger({ service: 'Void' });

    constructor() {
        this.logger.info('Initialised');
    }

    @On({ event: 'ready' })
    async ready() {
        // Fetch the void channel
        const channels = await client.guilds.cache.get('927461441051701280')?.channels.fetch();
        const voidChannel = channels?.find(channel => channel?.id === '1081483175202660403') as TextChannel | null;
        if (!voidChannel) return;

        this.logger.info('Void channel found');

        // Fetch all the messages in the channel
        const messages = await voidChannel?.messages.fetch();
        if (!messages) return;

        this.logger.info('Deleting messages', {
            guildId: voidChannel.guild.id,
            count: messages.size,
        });

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
        if (isVoidMessage) {
            this.logger.info('Void message already exists');
            return;
        }

        this.logger.info('Sending void message');

        // Send the embed
        await voidChannel.send({
            embeds: [embed]
        });
    }

    @On({ event: 'messageCreate' })
    async messageCreate([message]: ArgsOf<'messageCreate'>) {
        if (message.channel.id !== '1081483175202660403') return;
        if (message.author.bot && message.embeds[0].title === 'Void') return;

        this.logger.info('Deleting message in 60s', {
            messageId: message.id,
        });

        await sleep(60_000);
        await message.delete().catch(() => {
            this.logger.warn('Failed to delete message %s', message.id);
        });
    }
}
