import '@total-typescript/ts-reset';
import { ArgsOf, Discord, On } from 'discordx';
import { Logger } from '@app/logger';
import { wordsToNumbers } from 'words-to-numbers';
import type { ForumChannel } from 'discord.js';

@Discord()
export class Feature {
    private logger = new Logger({ service: 'Games' });
    private count: number;
    private lastMember: string;

    constructor() {
        this.logger.info('Initialised');
    }

    parseNumber(string: string): number {
        try {
            return Number(wordsToNumbers(string.trim()) ?? '1');
        } catch { }

        return 1;
    }

    findNextNumber(array: number[]) {
        let current = array[0]; // Assume the first number is the current number
        for (let i = 1; i < array.length; i++) {
            if (array[i] !== current + 1) { // Check if the number is not the next number in sequence
                current = array[i]; // Restart counting from the current number
            } else {
                current += 1; // Move to the next number in sequence
            }
        }
        return current;
    }

    @On({
        event: 'ready',
    })
    async ready([client]: ArgsOf<'ready'>) {
        // Get the counting thread
        const guild = await client.guilds.fetch('927461441051701280');
        const channel = await guild.channels.fetch('1100983365689159760') as ForumChannel;
        const thread = await channel.threads.fetch('1107624766061432832');

        // Get the last 20 messages
        const messages = await thread?.messages.fetch();

        // Find the streak we're currently on
        const nextNumber = this.findNextNumber([
            ...messages?.map(message => this.parseNumber(message.content)).filter(Boolean) ?? [0],
        ]);

        // Set the current count
        this.count = nextNumber - 1;
    }

    @On({
        event: 'messageCreate',
    })
    async messageCreate([message]: ArgsOf<'messageCreate'>) {
        // Bail if we're not in the counting thread
        if (message.thread?.id !== '1107624766061432832') return;

        // Get the current number
        const currentNumber = this.parseNumber(message.content);

        // If this isn't the next number then tell the user and reset it
        if (currentNumber !== (this.count + 1)) {
            await message.reply({
                embeds: [{
                    title: 'Count reset!',
                    description: `Last count was ${this.count} before <@${message.author.id}> caused it to reset by missing numbers.`
                }]
            });
            this.count = 0;
            return;
        }

        // If the user counted twice tell them and reset it
        if (this.lastMember === message.author.id) {
            await message.reply({
                embeds: [{
                    title: 'Count reset!',
                    description: `Last count was ${this.count} before <@${message.author.id}> caused it to reset by commenting twice in a row.`
                }]
            });
            this.count = 0;
            return;
        }

        // Update the count
        this.count++;

        // Set the last member to count
        this.lastMember = message.author.id;
    }
}
