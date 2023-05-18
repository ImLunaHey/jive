import '@total-typescript/ts-reset';
import { type ArgsOf, Discord, On } from 'discordx';
import { Logger } from '@app/logger';
import { wordsToNumbers } from 'words-to-numbers';
import { Colors } from 'discord.js';
import { db } from '@app/common/database';

const threadId = '1107637618235150376';

@Discord()
export class Feature {
    private logger = new Logger({ service: 'Games' });

    constructor() {
        this.logger.info('Initialised');
    }

    parseNumber(string: string): number | null {
        try {
            return Number(wordsToNumbers(string.trim()));
        } catch { }

        return null;
    }

    async resetCount(guildId: string, memberId: string, count: number) {
        // Reset current count to 0 and update highest score if it changed
        await db
            .transaction()
            .execute(async trx => {
                const highestCount = await db
                    .selectFrom('guild_counting')
                    .select('highestCount')
                    .where('guildId', '=', guildId)
                    .executeTakeFirst()
                    .then(_ => _?.highestCount ?? 0);

                await trx
                    .insertInto('guild_counting')
                    .values({
                        guildId,
                        currentCount: 0,
                        highestCount: Math.max(highestCount, count),
                        lastResetMemberId: memberId,
                        lastResetTimestamp: new Date(),
                    })
                    .onDuplicateKeyUpdate({
                        currentCount: 0,
                        highestCount: Math.max(highestCount, count),
                        lastResetMemberId: memberId,
                        lastResetTimestamp: new Date(),
                    })
                    .execute();
            });
    }

    @On({
        event: 'messageCreate',
    })
    async messageCreate([message]: ArgsOf<'messageCreate'>) {
        const guildId = message.guild?.id;
        const memberId = message.author.id;

        // Skip DM messages
        if (!guildId) return;

        // Skip messages not from members
        if (!memberId) return;

        // Skip bot messages
        if (message.author.bot) return;

        // Bail if we're not in the counting thread
        if (message.channel.id !== threadId) return;

        // Get the current number
        const currentNumber = this.parseNumber(message.content);

        // Bail if this wasn't a number message
        if (!currentNumber) return;

        // Get the current count for this guild
        const { count, highestCount, lastMemberId } = await db
            .selectFrom('guild_counting')
            .select('currentCount')
            .select('highestCount')
            .select('lastMemberId')
            .where('guildId', '=', guildId)
            .executeTakeFirst()
            .then(_ => ({
                count: _?.currentCount ?? 0,
                highestCount: _?.highestCount ?? 0,
                lastMemberId: _?.lastMemberId,
            }));

        // If this isn't the next number then tell the user and reset it
        if (currentNumber !== (count + 1)) {
            await message.react('❌');
            await message.reply({
                embeds: [{
                    title: 'Count reset!',
                    description: `Last count was ${count} before <@${message.author.id}> caused it to reset by missing numbers. Next number is \`1\`.`
                }]
            });

            // Reset the count for this guild
            await this.resetCount(guildId, memberId, count);
            return;
        }

        // If the user counted twice tell them and reset it
        if (lastMemberId === memberId) {
            await message.react('❌');
            await message.reply({
                embeds: [{
                    title: 'Count reset!',
                    description: `Last count was ${count} before <@${memberId}> caused it to reset by commenting twice in a row. Next number is \`1\`.`
                }]
            });

            // Reset the count for this guild
            await this.resetCount(guildId, memberId, count);
            return;
        }

        // Update the count
        await db
            .insertInto('guild_counting')
            .values(eb => ({
                guildId,
                currentCount: eb.bxp('currentCount', '+', 1),
                highestCount: Math.max(highestCount, count + 1),
                lastMemberId: memberId,
            }))
            .onDuplicateKeyUpdate(eb => ({
                currentCount: eb.bxp('currentCount', '+', 1),
                highestCount: Math.max(highestCount, count + 1),
                lastMemberId: memberId,
            }))
            .execute();

        // Check if this was a multiple of 100
        if (count >= 100 && (count % 100 === 0)) {
            // Tell the users of the achievement
            await message.channel.send({
                embeds: [{
                    title: 'Goal hit!',
                    description: `Next goal is ${((count / 100) + 1) * 100}`,
                    color: Colors.Green,
                }]
            });
        }

        // React the the message so the user knows it was correct
        await message.react('✅');

        // Log current count
        this.logger.info('Current count', {
            guildId,
            count,
        });
    }
}
