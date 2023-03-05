import { prisma } from '@app/common/prisma-client';
import { globalLogger } from '@app/logger';
import { ApplicationCommandOptionType, CommandInteraction, GuildMember } from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';
import { outdent } from 'outdent';

@Discord()
export class Feature {
    private logger = globalLogger.scope('Economy');

    constructor() {
        this.logger.success('Feature initialized');
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
        const user = await prisma.guildMember.findUnique({ where: { id: interaction.member?.user.id } });
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
        if (!interaction.guild?.id) return;
        if (!interaction.member?.user.id) return;

        // Show the bot thinking
        await interaction.deferReply({ ephemeral: false });

        // Get the user's balance
        const user = await prisma.guildMember.findUnique({ where: { id: interaction.member?.user.id } });
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
        await prisma.guildMember.upsert({
            where: { id: interaction.member?.user.id },
            update: {
                coins: {
                    increment: random
                }
            },
            create: {
                id: interaction.member?.user.id,
                coins: random,
                guild: {
                    connect: {
                        id: interaction.guild.id
                    }
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

        // Check if the user has already claimed their daily
        const daily = await prisma.rateLimit.findFirst({ where: { id: 'economy:daily', guildMember: { id: interaction.member?.user.id } } });

        // Only allow them to claim their daily once per 24 hours
        if (daily && daily.lastReset.getTime() > (Date.now() - 86_400_000)) {
            await interaction.editReply({
                embeds: [{
                    title: 'Daily',
                    description: 'You have already claimed your daily coins today.'
                }]
            });
            return;
        }

        // Mark the daily as claimed for this user in this guild
        await prisma.rateLimit.create({
            data: {
                id: 'economy:daily',
                guildMember: {
                    connect: {
                        id: interaction.member?.user.id
                    }
                }
            }
        });

        // Give them their daily coins
        const guildMember = await prisma.guildMember.update({
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
                description: `You get your daily coins and get \`${100}\` coins. You now have \`${guildMember.coins + 100}\` coins.`
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
        if (!interaction.guild?.id) return;

        // Show the bot thinking
        await interaction.deferReply({ ephemeral: false });

        try {
            // Get the user's balance
            const userBalance = await prisma.guildMember.findUnique({ where: { id: interaction.member?.user.id } }).then(user => user?.coins ?? 0);

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
                prisma.guildMember.update({
                    where: { id: interaction.member?.user.id },
                    data: {
                        coins: {
                            decrement: amount
                        }
                    }
                }),
                prisma.guildMember.upsert({
                    where: { id: target.id },
                    create: {
                        id: target.id,
                        coins: amount,
                        guild: {
                            connect: {
                                id: interaction.guild.id
                            }
                        }
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
            this.logger.error('Failed to transfer coins', error);
            await interaction.editReply({
                content: 'Failed to transfer coins, please let a member of staff know.'
            });
        }
    }
}