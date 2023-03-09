import { prisma } from '@app/common/prisma-client';
import { levelService } from '@app/features/leveling/service';
import { globalLogger } from '@app/logger';
import { Category, Rarity } from '@prisma/client';
import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, CommandInteraction, GuildMember } from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';
import { outdent } from 'outdent';

const getClosest = (array: number[], goal: number) => array.reduce((prev, curr) => Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev);
const createChance = <T = unknown>(results: Record<number, T>): (() => T) => () => {
    const chance = Math.floor(Math.random() * 100);
    const closest = getClosest(Object.keys(results).map(Number), chance);
    return results[closest] as T;
};

const createRarity = createChance({
    20: Rarity.COMMON,
    40: Rarity.UNCOMMON,
    60: Rarity.RARE,
    80: Rarity.EPIC,
    95: Rarity.LEGENDARY,
    100: Rarity.MYTHIC,
});

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
                xp: 0,
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
        name: 'hunt',
        description: 'Hunt in the wilderness',
    })
    async hunt(
        @SlashOption({
            name: 'weapon',
            description: 'The weapon you want to take with you',
            type: ApplicationCommandOptionType.String,
            required: false,
            async autocomplete(interaction) {
                const weapons = await prisma.item.findMany({
                    where: {
                        owner: {
                            id: interaction.member?.user.id
                        },
                        category: Category.WEAPONS
                    }
                });

                // Respond with the weapons
                await interaction.respond(weapons.map(weapon => ({
                    name: `${weapon.emoji} ${weapon.name} (${weapon.damage})`,
                    value: weapon.id
                })));
            },
        }) weaponId: string,
        interaction: CommandInteraction,
    ) {
        if (!interaction.guild?.id) return;
        if (!interaction.member?.user.id) return;

        // Show the bot thinking
        await interaction.deferReply({ ephemeral: false });

        // Get the weapon
        const weapon = await prisma.item.findUnique({ where: { id: weaponId } }) ?? {
            name: 'Fists',
            emoji: '👊',
            damage: 1
        };

        // Generate a random creature for them to hunt
        const rarity = createRarity();
        const creatures = await prisma.creature.findMany({
            where: {
                rarity
            }
        });
        const creature = creatures[Math.floor(Math.random() * creatures.length)];

        // Check if they have something to heal with
        const healItems = await prisma.item.findMany({
            where: {
                owner: {
                    id: interaction.member?.user.id
                },
                category: Category.CONSUMABLES,
                heal: {
                    gt: 0
                }
            }
        });

        // Respond with the creature
        await interaction.reply({
            embeds: [{
                title: 'Hunt',
                description: `You go hunting with your ${weapon?.emoji} ${weapon?.name} and find a ${creature.emoji} ${creature.name} [${creature.rarity}].`
            }],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId(`hunt:attack:${creature.id}`)
                            .setLabel('Attack')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('hunt:run')
                            .setLabel('Run')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('hunt:heal')
                            .setLabel('Heal')
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(healItems.length === 0),
                        new ButtonBuilder()
                            .setCustomId('hunt:inventory')
                            .setLabel('Inventory')
                            .setStyle(ButtonStyle.Secondary)
                    ])
            ]
        });
    }

    @Slash({
        name: 'profile',
        description: 'Check your profile',
    })
    async profile(
        interaction: CommandInteraction
    ) {
        // Show the bot thinking
        await interaction.deferReply({ ephemeral: false });

        // Get the user's details
        const user = await prisma.guildMember.findUnique({ where: { id: interaction.member?.user.id } });
        if (!user) return;

        // Get the level details
        const currentLevelXp = levelService.getCurrentLevelXp(user.xp);
        const nextLevelXP = levelService.getNextLevelXp(user.xp);
        const levelProgress = levelService.getLevelProgress(user.xp);

        // Send the balance
        await interaction.editReply({
            embeds: [{
                author: {
                    name: `${interaction.member?.user.username}'s profile`,
                    icon_url: interaction.user.avatarURL() ?? undefined
                },
                title: 'Standard player',
                fields: [{
                    name: 'PROGRESS',
                    value: outdent`
                        **Level:** ${levelService.convertXpToLevel(user.xp)}
                        **XP:** ${currentLevelXp}/${nextLevelXP} (${levelProgress})
                    `
                }, {
                    name: 'STATS',
                    value: outdent`
                        🤺 **Attack:** ${user.attack}
                        🛡️ **Defence:** ${user.defence}
                        🏋️ **Strength:** ${user.strength}
                        🏃 ** Agility:** ${user.agility}
                        🧠 **Intelligence:** ${user.intelligence}
                        📖 **Wisdom:** ${user.wisdom}
                        😎 **Charisma:** ${user.charisma}
                        🍀 **Luck:** ${user.luck}
                        💗 **Health:** ${user.health}/100
                    `
                }, {
                    name: 'SKILLS',
                    value: outdent`
                        🪓 **Woodcutting:** ${user.woodcutting}
                        ⛏️ **Mining:** ${user.mining}
                        🌾 **Farming:** ${user.farming}
                        🎣 **Fishing:** ${user.fishing}
                        👩‍🍳 **Cooking:** ${user.cooking}
                        ⚒️ **Smithing:** ${user.smithing}
                        🧵 **Crafting:** ${user.crafting}
                    `
                }, {
                    name: 'MONEY',
                    value: outdent`
                        <:coins:1083037299220152351> **Coins:** ${Intl.NumberFormat().format(user?.coins)}
                        🏦 **Bank:** 0
                    `
                }]
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
                count: 0,
                lastReset: new Date(),
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
                        xp: 0,
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

    // @Slash({
    //     name: 'shop',
    //     description: 'View the shop'
    // })
    // async shop(
    //     interaction: CommandInteraction
    // ) {
    //     // Show the bot thinking
    //     await interaction.deferReply({ ephemeral: false });

    //     // Get the items
    //     const items = await prisma.item.findMany({
    //         where: {
    //             owner: null
    //         },
    //         take: 25,
    //     });

    //     // Send the shop
    //     await interaction.editReply({
    //         embeds: [{
    //             title: 'Shop',
    //             description: items.map(item => outdent`
    //                 <${item.emoji}> **${item.name}**
    //                 ${item.description}
    //                 \`${item.price}\` <:coin~1:1083037299220152351>
    //             `).join('\n\n')
    //         }]
    //     });
    // }

    // @Slash({
    //     name: 'buy',
    //     description: 'Buy an item from the shop'
    // })
    // async buy(
    //     @SlashOption({
    //         name: 'item',
    //         description: 'The item you want to buy',
    //         type: ApplicationCommandOptionType.String,
    //         required: true,
    //         async autocomplete(interaction) {
    //             const focusedOption = interaction.options.getFocused(true);
    //             const choices = await prisma.item.findMany({
    //                 where: {
    //                     owner: null
    //                 }
    //             });
    //             const filtered = choices.filter(item => item.name.startsWith(focusedOption.value)).slice(0, 25);

    //             await interaction.respond(
    //                 filtered.map(choice => ({ name: choice.name, value: choice.id })),
    //             );
    //         },
    //     }) itemId: string,
    //     @SlashOption({
    //         name: 'quantity',
    //         description: 'How many you want to buy',
    //         type: ApplicationCommandOptionType.Number,
    //         required: false,
    //         async autocomplete(interaction) {
    //             await interaction.respond([{
    //                 name: '1',
    //                 value: 1,
    //             }, {
    //                 name: '100',
    //                 value: 100,
    //             }, {
    //                 name: '1k',
    //                 value: 1_000,
    //             }, {
    //                 name: '10k',
    //                 value: 10_000,
    //             }]);
    //         },
    //     }) quantity: number = 1,
    //     interaction: CommandInteraction
    // ) {
    //     if (!interaction.guild?.id) return;

    //     // Show the bot thinking
    //     await interaction.deferReply({ ephemeral: false });

    //     // Get the item
    //     const item = await prisma.item.findUnique({ where: { id: itemId } });
    //     if (!item) {
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Buy',
    //                 description: 'That item does not exist.',
    //             }],
    //         });
    //         return;
    //     }

    //     try {
    //         // Handle the transaction
    //         const newItem = await prisma.$transaction(async prisma => {
    //             if (!interaction.guild?.id) throw new Error('Guild ID is null');

    //             // If this is a consumable item decrement the quantity
    //             if (item.quantity !== null) {
    //                 // If the item is out of stock, don't let the user buy it
    //                 if (item.quantity && item.quantity < 0) throw new UserError('This item is out of stock.');

    //                 // Check if the user is trying to buy more than the quantity
    //                 if (item.quantity && item.quantity < quantity) throw new UserError(`You can only buy ${item.quantity} of this item.`);

    //                 // Decrement the item's quantity by the amount the user wants to buy
    //                 await prisma.item.update({
    //                     where: { id: item.id },
    //                     data: {
    //                         quantity: {
    //                             decrement: quantity,
    //                         }
    //                     },
    //                 });
    //             } else {
    //                 // If the item is not a consumable, make sure the user isn't trying to buy more than 1
    //                 if (quantity > 1) throw new UserError('This item is not a commodity, you can only buy 1 at a time.');

    //                 // Remove the item from the shop
    //                 await prisma.item.delete({
    //                     where: { id: item.id },
    //                 });
    //             }

    //             // Take the user's coins
    //             const guildMember = await prisma.guildMember.update({
    //                 where: { id: interaction.member?.user.id },
    //                 data: {
    //                     coins: {
    //                         decrement: item?.price * quantity,
    //                     },
    //                 },
    //             });

    //             // If the user doesn't have enough coins, don't let them buy the item
    //             if (guildMember.coins < 0) throw new UserError(`You don't have enough coins to buy this item. You need \`${item.price * quantity}\` coins.`);

    //             // Add the coins to the guild
    //             await prisma.guild.update({
    //                 where: { id: interaction.guild.id },
    //                 data: {
    //                     coins: {
    //                         increment: item?.price * quantity,
    //                     },
    //                 },
    //             });

    //             // Give the user the item
    //             const newItem = await prisma.item.create({
    //                 data: {
    //                     category: item.category,
    //                     name: item.name,
    //                     emoji: item.emoji,
    //                     description: item.description,
    //                     price: item.price,
    //                     quantity,
    //                     bonus: item.bonus,
    //                     chance: item.chance,
    //                     cooldown: item.cooldown,
    //                     damage: item.damage,
    //                     defense: item.defense,
    //                     // If the item is a collectable, give it the same rarity as the item
    //                     // Otherwise, give it a random rarity
    //                     ...(item.category === Category.COLLECTABLES ? {
    //                         rarity: item.rarity,
    //                     } : {
    //                         rarity: createRarity()
    //                     }),
    //                     owner: {
    //                         connect: {
    //                             id: interaction.member?.user.id,
    //                         },
    //                     },
    //                 },
    //             });

    //             return newItem;
    //         });

    //         // Tell the user they bought the item
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Buy',
    //                 description: `You bought \`${quantity}\`x ${newItem.rarity} ${item.name} for \`${item.price * quantity}\` coins.`
    //             }],
    //         });
    //     } catch (error: unknown) {
    //         if (!(error instanceof Error)) throw new Error('Unknown Error: ' + error);

    //         // If the error is a user error, send it to the user
    //         if (error instanceof UserError) {
    //             await interaction.editReply({
    //                 embeds: [{
    //                     title: 'Buy',
    //                     description: error.message,
    //                 }],
    //             });
    //             return;
    //         }

    //         this.logger.error('Failed to buy item', error);
    //         await interaction.editReply({
    //             content: 'Failed to buy item, please let a member of staff know.'
    //         });
    //         return;
    //     }
    // }

    @Slash({
        name: 'inventory',
        description: 'View your inventory'
    })
    async inventory(
        @SlashOption({
            name: 'page',
            description: 'The page you want to view',
            type: ApplicationCommandOptionType.Number,
            required: false,
        }) page: number = 1,
        interaction: CommandInteraction
    ) {
        if (!interaction.guild?.id) return;

        // Show the bot thinking
        await interaction.deferReply({ ephemeral: false });

        // Get the items
        const items = await prisma.item.findMany({
            where: {
                owner: {
                    id: interaction.member?.user.id,
                }
            },
            take: 25,
            skip: (page - 1) * 25,
        });

        // Send your inventory
        await interaction.editReply({
            embeds: [{
                title: 'Inventory',
                description: items.map(item => outdent`
                    **${item.name}** [${item.rarity}]
                    ${item.description}
                    \`${item.price}\` coins
                `).join('\n\n')
            }],
        });
    }
}
