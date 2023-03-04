import { prisma } from '@app/common/prisma-client';
import { logger } from '@app/logger';
import { ApplicationCommandOptionType, CommandInteraction, GuildMember } from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';
import { outdent } from 'outdent';

@Discord()
export class Feature {
    constructor() {
        logger.success('Debug feature initialized');
    }

    @Slash({
        name: 'balance',
        description: 'Check your balance',
    })
    async balance(
        interaction: CommandInteraction
    ) {
        // Show the bot thinking
        await interaction.deferReply({ ephemeral: false });

        // Get the user's balance
        const user = await prisma.user.findUnique({ where: { id: interaction.member?.user.id } });
        const balance = user?.coins ?? 0;

        // Send the balance
        await interaction.editReply({
            embeds: [{
                title: 'Balance',
                description: `Your balance is ${balance} coins.`
            }]
        });
    }

    @Slash({
        name: 'beg',
        description: 'Beg for coins',
    })
    async beg(
        interaction: CommandInteraction
    ) {
        // Show the bot thinking
        await interaction.deferReply({ ephemeral: false });

        // Get the user's balance
        const user = await prisma.user.findUnique({ where: { id: interaction.member?.user.id } });
        const balance = user?.coins ?? 0;

        // If the user has too much money, don't let them beg
        if (balance >= 100) {
            await interaction.editReply({
                embeds: [{
                    title: 'Beg',
                    description: 'You try to beg, but nobody gives you any money. You\'re too rich for that.'
                }]
            });
        }

        // Generate a random number between 0 and 100
        const random = Math.floor(Math.random() * 100);

        // Otherwise, let them beg
        await prisma.user.update({
            where: { id: interaction.member?.user.id },
            data: {
                coins: {
                    increment: random
                }
            }
        });

        // Send the balance
        await interaction.editReply({
            embeds: [{
                title: 'Beg',
                description: `You beg for money and get \`${random}\` coins. You now have \`${balance + random}\` coins.`
            }]
        });
    }

    @Slash({
        name: 'daily',
        description: 'Get your daily coins',
    })
    async daily(
        interaction: CommandInteraction
    ) {
        // Show the bot thinking
        await interaction.deferReply({ ephemeral: false });

        // Get the user's balance
        const user = await prisma.user.findUnique({ where: { id: interaction.member?.user.id } });
        const balance = user?.coins ?? 0;

        // If the user has too much money, don't let them beg
        if (balance >= 100) {
            await interaction.editReply({
                embeds: [{
                    title: 'Daily',
                    description: 'You try to get your daily coins, but you\'re too rich for that.'
                }]
            });
        }

        // Otherwise, let them beg
        await prisma.user.update({
            where: { id: interaction.member?.user.id },
            data: {
                coins: {
                    increment: 100
                }
            }
        });

        // Send the balance
        await interaction.editReply({
            embeds: [{
                title: 'Daily',
                description: `You get your daily coins and get \`${100}\` coins. You now have \`${balance + 100}\` coins.`
            }]
        });
    }

    @Slash({
        name: 'give',
        description: 'Give someone coins'
    })
    async give(
        @SlashOption({
            name: 'member',
            description: 'The member who you want to give coins to',
            type: ApplicationCommandOptionType.User,
            required: true
        }) target: GuildMember,
        @SlashOption({
            name: 'amount',
            description: 'How many coins you want to give them',
            type: ApplicationCommandOptionType.Number,
            required: true
        }) amount: number,
        interaction: CommandInteraction
    ) {
        // Show the bot thinking
        await interaction.deferReply({ ephemeral: false });

        try {
            // Get the user's balance
            const userBalance = await prisma.user.findUnique({ where: { id: interaction.member?.user.id } }).then(user => user?.coins ?? 0);

            // If the user doesn't have enough money, don't let them give
            if (userBalance < amount) {
                await interaction.editReply({
                    embeds: [{
                        title: 'Give',
                        description: outdent`
                            You can\'t give <@${target.id}> \`${amount}\` coins, as you only have \`${userBalance}\` coins. You will need \`${amount - userBalance}\` more coins.
                        `
                    }],
                });

                return;
            }

            // Transfer the coins
            await prisma.$transaction([
                prisma.user.update({
                    where: { id: interaction.member?.user.id },
                    data: {
                        coins: {
                            decrement: amount
                        }
                    }
                }),
                prisma.user.upsert({
                    where: { id: target.id },
                    create: {
                        id: target.id,
                        coins: amount
                    },
                    update: {
                        coins: {
                            increment: amount
                        }
                    }
                })
            ]);

            // Send the balance
            await interaction.editReply({
                embeds: [{
                    title: 'Give',
                    description: `You give ${target} ${amount} coins. You now have ${userBalance - amount} coins.`
                }]
            });
        } catch (error: unknown) {
            if (!(error instanceof Error)) throw new Error('Unknown Error: ' + error);
            logger.error('Failed to transfer coins', error);
            await interaction.editReply({
                content: 'Failed to transfer coins, please let a member of staff know.'
            });
        }
    }
}