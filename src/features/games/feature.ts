import '@total-typescript/ts-reset';
import { type ArgsOf, Discord, On } from 'discordx';
import { Logger } from '@app/logger';
import { wordsToNumbers } from 'words-to-numbers';
import { Colors, ForumChannel } from 'discord.js';

const threadId = '1107637618235150376';

@Discord()
export class Feature {
    private logger = new Logger({ service: 'Games' });
    private count: number;
    private lastMember?: string;

    constructor() {
        this.logger.info('Initialised');
    }

    parseNumber(string: string): number | null {
        try {
            return Number(wordsToNumbers(string.trim()));
        } catch { }

        return null;
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
        const channel = await guild.channels.fetch(threadId) as ForumChannel;

        // Get the last 20 messages
        const messages = await channel?.messages.fetch();

        // Find the streak we're currently on
        const nextNumber = this.findNextNumber([
            ...messages
                .filter(message => !message.author.bot)
                .map(message => this.parseNumber(message.content))
                .filter(Boolean),
        ]) ?? 1;

        // Set the current count
        this.count = nextNumber - 1;
        this.logger.info('Fetched starting count', {
            count: this.count,
        });
    }

    @On({
        event: 'messageCreate',
    })
    async messageCreate([message]: ArgsOf<'messageCreate'>) {
        // Skip bot messages
        if (message.author.bot) return;

        // Bail if we're not in the counting thread
        if (message.channel.id !== threadId) return;

        // Get the current number
        const currentNumber = this.parseNumber(message.content);

        // Bail if this wasn't a number message
        if (!currentNumber) return;

        // If this isn't the next number then tell the user and reset it
        if (currentNumber !== (this.count + 1)) {
            await message.react('❌');
            await message.reply({
                embeds: [{
                    title: 'Count reset!',
                    description: `Last count was ${this.count} before <@${message.author.id}> caused it to reset by missing numbers. Next number is \`1\`.`
                }]
            });
            this.count = 0;
            return;
        }

        // If the user counted twice tell them and reset it
        if (this.lastMember === message.author.id) {
            await message.react('❌');
            await message.reply({
                embeds: [{
                    title: 'Count reset!',
                    description: `Last count was ${this.count} before <@${message.author.id}> caused it to reset by commenting twice in a row. Next number is \`1\`.`
                }]
            });
            this.count = 0;
            return;
        }

        // Update the count
        this.count++;

        // Set the last member to count
        this.lastMember = message.author.id;

        // Check if this was a multiple of 100
        if (this.count >= 100 && (this.count % 100 === 0)) {
            // Tell the users of the achievement
            await message.channel.send({
                embeds: [{
                    title: 'Goal hit!',
                    description: `Next goal is ${((this.count / 100) + 1) * 100}`,
                    color: Colors.Green,
                }]
            });
        }

        // React the the message so the user knows it was correct
        await message.react('✅');

        // Log current count
        this.logger.info('Current count', {
            guildId: message.guild?.id,
            count: this.count,
        });
    }
}
