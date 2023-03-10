import { client } from '@app/client';
import { GuildMemberGuard } from '@app/common/create-guild-member';
import { prisma } from '@app/common/prisma-client';
import { levelService } from '@app/features/leveling/service';
import { globalLogger } from '@app/logger';
import { Rarity } from '@prisma/client';
import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, GuildMember, MessageComponentInteraction } from 'discord.js';
import { ButtonComponent, Discord, Guard, Slash, SlashOption } from 'discordx';
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

// emojibar('<:lb_g:1083768174383726673>', '<:l_g:1083768215324340344>', '<:lb4_g:1083768231346577509>', '<:lb2_g:1083768151629635604>', '<:l2_g:1083768196236050442>', '<:lb3_g:1083768245489778798>', 10, 100, 5)
// 
const emojibar = (value: number, options?: {
    bars?: {
        full: {
            start: string;
            bar: string;
            end: string;
        };
        empty: {
            start: string;
            bar: string;
            end: string;
        };
    };
    maxValue?: number;
    size?: number;
}) => {
    const bars = options?.bars ?? {
        full: {
            start: '<:lb_g:1083768174383726673>',
            bar: '<:l_g:1083768215324340344>',
            end: '<:lb4_g:1083768231346577509>',
        },
        empty: {
            start: '<:lb2_g:1083768151629635604>',
            bar: '<:l2_g:1083768196236050442>',
            end: '<:lb3_g:1083768245489778798>',
        },
    };
    const maxValue = options?.maxValue ?? 100;
    const size = options?.size ?? 5;
    const bar = [];
    const full = Math.round(size * (value / maxValue > 1 ? 1 : value / maxValue));
    const empty = size - full > 0 ? size - full : 0;
    for (let i = 1; i <= full; i++) bar.push(bars.full.bar);
    for (let i = 1; i <= empty; i++) bar.push(bars.empty.bar);
    bar[0] = bar[0] == bars.full.bar ? bars.full.start : bars.empty.start;
    bar[bar.length - 1] = bar[bar.length - 1] == bars.full.bar ? bars.full.end : bars.empty.end;
    return bar.join('');
}

@Discord()
@Guard(GuildMemberGuard)
@Guard(async (interaction: CommandInteraction, _client, next) => {
    if (!interaction.guild?.id) return;
    if (!interaction.member?.user.id) return;

    // Skip this if it's the create-character command
    if (interaction.commandName === 'create-character') return next();

    // Ensure the user has setup their character
    const user = await prisma.guildMember.findUnique({ where: { id: interaction.member?.user.id } });
    if (!user?.setup) {
        interaction.reply({
            embeds: [{
                title: 'Character',
                description: 'You don\'t have a character yet. Please create one with `/create-character`.'
            }]
        });
        return;
    }

    return next();
})
export class Feature {
    private logger = globalLogger.scope('Economy');

    constructor() {
        this.logger.success('Feature initialized');
    }

    @Slash({
        name: 'create-character',
        description: 'Create your character',
    })
    async createCharacter(
        interaction: CommandInteraction,
    ) {
        if (!interaction.guild?.id) return;
        if (!interaction.member?.user.id) return;

        // Get the user's character
        const user = await prisma.guildMember.findUnique({ where: { id: interaction.member?.user.id } });
        if (!user) return;

        // Send the embed
        await interaction.reply({
            embeds: [{
                title: 'Create character',
                description: outdent`
                    Create your character by assigning your stats. You have 10 points to spend.
                    You can assign points to your stats by clicking the buttons below.

                    **Strength** - Increases your damage.
                    **Dexterity** - Increases your critical hit chance.
                    **Intelligence** - Increases your mana.
                    **Wisdom** - Increases your mana regeneration.
                    **Charisma** - Increases your gold gain.
                `,
            }],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId('create-character-strength-up')
                            .setLabel('💪 ⬆️')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('create-character-dexterity-up')
                            .setLabel('🤸‍♂️ ⬆️')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('create-character-intelligence-up')
                            .setLabel('🧠 ⬆️')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('create-character-wisdom-up')
                            .setLabel('🧠 ⬆️')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('create-character-charisma-up')
                            .setLabel('🧠 ⬆️')
                            .setStyle(ButtonStyle.Success),
                    ]),
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId('create-character-strength-down')
                            .setLabel(`💪 ${user?.strength}`)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('create-character-dexterity-down')
                            .setLabel(`🤸‍♂️ ${user?.dexterity}`)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('create-character-intelligence-down')
                            .setLabel(`🧠 ${user?.intelligence}`)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('create-character-wisdom-down')
                            .setLabel(`🧠 ${user?.wisdom}`)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('create-character-charisma-down')
                            .setLabel(`🧠 ${user?.charisma}`)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                    ]),
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId('create-character-strength-down')
                            .setLabel(`💪 ⬇️ ${user?.strength}`)
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('create-character-dexterity-down')
                            .setLabel(`🤸‍♂️ ⬇️ ${user?.dexterity}`)
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('create-character-intelligence-down')
                            .setLabel(`🧠 ⬇️ ${user?.intelligence}`)
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('create-character-wisdom-down')
                            .setLabel(`🧠 ⬇️ ${user?.wisdom}`)
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('create-character-charisma-down')
                            .setLabel(`🧠 ⬇️ ${user?.charisma}`)
                            .setStyle(ButtonStyle.Success),
                    ]),
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId('create-character-submit')
                            .setLabel('Submit')
                            .setStyle(ButtonStyle.Success),
                    ]),
            ]
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
        await prisma.guildMember.update({
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
        name: 'explore',
        description: 'Explore the world',
    })
    async explore(
        interaction: CommandInteraction,
    ) {
        if (!interaction.guild?.id) return;
        if (!interaction.member?.user.id) return;

        // Show the bot thinking
        await interaction.deferReply({ ephemeral: false });

        // Grab a list of creatures that can be encountered
        const creatures = await prisma.creature.findMany();

        // Check if we found a creature
        if (creatures.length === 0) {
            await interaction.editReply({
                embeds: [{
                    title: 'Explore',
                    description: 'You explore the world, but you don\'t find anything.'
                }]
            });

            return;
        }

        // Get a random creature
        const creature = creatures[Math.floor(Math.random() * creatures.length)];

        // Save the encounter
        const encounter = await prisma.encounter.create({
            data: {
                creature: {
                    connect: {
                        id: creature.id
                    }
                },
                guild: {
                    connect: {
                        id: interaction.guild.id
                    }
                },
                guildMember: {
                    connect: {
                        id: interaction.member?.user.id
                    }
                }
            }
        });

        // Respond with their encounter
        await interaction.editReply({
            embeds: [{
                title: 'Encounter',
                description: outdent`
                    You encounter a [${creature.rarity}] **${creature.name}**!
                    It has **${creature.health - encounter.damageTaken}** health and **${creature.damage}** attack.
                `
            }],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId('encounter-attack')
                            .setLabel('Start battle')
                            .setStyle(ButtonStyle.Primary),
                    ]),
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId('encounter-run')
                            .setLabel('Run')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('encounter-inventory')
                            .setLabel('Inventory')
                            .setStyle(ButtonStyle.Secondary)
                    ])
            ]
        });
    }

    @ButtonComponent({
        id: 'encounter-attack',
    })
    async attack(
        interaction: ButtonInteraction,
    ) {
        if (!interaction.guild?.id) return;
        if (!interaction.member?.user.id) return;

        // Get the encounter
        const encounter = await prisma.encounter.findFirst({
            where: {
                guildMember: {
                    id: interaction.member?.user.id
                }
            },
            include: {
                creature: true,
                guild: true,
                guildMember: true
            }
        });
        if (!encounter) return;

        // Get the user's details
        const user = await prisma.guildMember.findUnique({ where: { id: interaction.member?.user.id } });
        if (!user) return;

        // Roll a d20 to see who goes first
        const roll = Math.floor(Math.random() * 20) + 1;

        // If the user goes first
        if (roll >= 10) {
            // Get the user's damage
            // @TODO: Add damage modifiers
            const damage = 1;

            // Update the encounter
            await prisma.encounter.update({
                where: {
                    id: encounter.id
                },
                data: {
                    damageTaken: {
                        increment: damage
                    }
                }
            });

            // If the creature is dead
            if (encounter.creature.health - (encounter.damageTaken + damage) <= 0) {
                // // Get the user's xp
                // @TODO: Add xp modifiers
                const xp = 1;

                // // Update the user's xp
                // await prisma.guildMember.update({
                //     where: {
                //         id: interaction.member?.user.id
                //     },
                //     data: {
                //         xp: {
                //             increment: xp
                //         }
                //     }
                // });

                // Respond with the result
                await interaction.update({
                    embeds: [{
                        title: 'Encounter',
                        description: outdent`
                            You attack the **${encounter.creature.name}** and kill it!
                            You gain **${xp}** xp.
                        `
                    }],
                    components: []
                });
            } else {
                // Respond with the result
                await interaction.update({
                    embeds: [{
                        title: 'Encounter',
                        description: outdent`
                            You attack the **${encounter.creature.name}** and deal **${damage}** damage.
                            It now has **${encounter.creature.health - (encounter.damageTaken + damage)}** health.
                        `
                    }],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>()
                            .addComponents([
                                new ButtonBuilder()
                                    .setCustomId('encounter-attack')
                                    .setLabel('Attack')
                                    .setStyle(ButtonStyle.Primary),
                            ]),
                        new ActionRowBuilder<ButtonBuilder>()
                            .addComponents([
                                new ButtonBuilder()
                                    .setCustomId('encounter-run')
                                    .setLabel('Run')
                                    .setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder()
                                    .setCustomId('encounter-inventory')
                                    .setLabel('Inventory')
                                    .setStyle(ButtonStyle.Secondary)
                            ])
                    ]
                });
            }
        } else {
            // Get the creature's damage
            // @TODO: Add damage modifiers
            const damage = 1;

            // Update the encounter
            await prisma.encounter.update({
                where: {
                    id: encounter.id
                },
                data: {
                    damage: {
                        increment: damage
                    }
                }
            });

            // Update the user's health
            await prisma.guildMember.update({
                where: {
                    id: interaction.member?.user.id
                },
                data: {
                    constitution: {
                        decrement: damage
                    }
                }
            });

            // If the user is dead
            if (encounter.guildMember.constitution - (encounter.damage + damage) <= 0) {
                // Respond with the result
                await interaction.update({
                    embeds: [{
                        title: 'Encounter',
                        description: outdent`
                            The **${encounter.creature.name}** attacks you dealing **${damage}** damage.
                            You are now dead. 🪦
                        `
                    }]
                });
            } else {
                // Respond with the result
                await interaction.update({
                    embeds: [{
                        title: 'Encounter',
                        description: outdent`
                            The **${encounter.creature.name}** attacks you dealing **${damage}** damage.
                            You now have **${encounter.guildMember.constitution - (encounter.damage + damage)}** health.
                        `
                    }],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>()
                            .addComponents([
                                new ButtonBuilder()
                                    .setCustomId('encounter-attack')
                                    .setLabel('Attack')
                                    .setStyle(ButtonStyle.Primary),
                            ]),
                        new ActionRowBuilder<ButtonBuilder>()
                            .addComponents([
                                new ButtonBuilder()
                                    .setCustomId('encounter-run')
                                    .setLabel('Run')
                                    .setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder()
                                    .setCustomId('encounter-inventory')
                                    .setLabel('Inventory')
                                    .setStyle(ButtonStyle.Secondary)
                            ])
                    ]
                });
            }
        }
    }

    @ButtonComponent({
        id: 'encounter-run',
    })
    async run(
        interaction: ButtonInteraction
    ) {
        // Get the encounter
        const encounter = await prisma.encounter.findFirst({
            where: {
                guildMember: {
                    id: interaction.member?.user.id
                }
            },
            include: {
                creature: true,
                guild: true,
                guildMember: true
            }
        });

        // If there is no encounter
        if (!encounter) return;

        // Delete the encounter
        await prisma.encounter.delete({
            where: {
                id: encounter.id
            }
        });

        // Respond with the result
        await interaction.update({
            embeds: [{
                title: 'Encounter',
                description: `You run away from the **${encounter.creature.name}**.`
            }],
            components: []
        });
    }

    @ButtonComponent({
        id: 'encounter-inventory',
    })
    async encounterInventory(
        interaction: ButtonInteraction
    ) {
        // Get the encounter
        const encounter = await prisma.encounter.findFirst({
            where: {
                guildMember: {
                    id: interaction.member?.user.id
                }
            }
        });

        // If there is no encounter
        if (!encounter) {
            // Respond with the result
            await interaction.update({
                embeds: [{
                    title: 'Encounter',
                    description: 'You are not in an encounter.'
                }],
                components: []
            });
            return;
        }

        // Get the user's inventory
        const user = await prisma.guildMember.findUnique({
            where: {
                id: interaction.member?.user.id
            },
            include: {
                inventory: true,
            },
        });
        if (!user) return;

        const components = [
            ...(user.inventory.length >= 1 ? [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        user.inventory.slice(0, 5).map(item => {
                            const [_, emojiName, emojiId] = item.emoji.split(':');
                            console.log({
                                name: emojiName,
                                id: emojiId || undefined,
                            })
                            return new ButtonBuilder()
                                .setCustomId(`encounter-inventory-${item.id}`)
                                .setLabel(item.name)
                                .setEmoji({
                                    name: emojiName,
                                    id: emojiId || undefined,
                                })
                                .setStyle(ButtonStyle.Primary);
                        })
                    )
            ] : []),
        ];

        // Respond with the result
        await interaction.update({
            embeds: [{
                title: 'Encounter',
                description: 'You open your inventory.'
            }],
            components,
        });
    }

    @Slash({
        name: 'creature',
        description: 'Check a creature\'s details',
    })
    async creature(
        @SlashOption({
            name: 'name',
            description: 'The name of the creature',
            required: true,
            type: ApplicationCommandOptionType.String,
            async autocomplete(interaction) {
                const name = interaction.options.getString('name');
                const creatures = await prisma.creature.findMany({
                    where: name ? {
                        name: {
                            contains: name
                        }
                    } : {}
                });

                await interaction.respond(creatures.map(creature => {
                    return {
                        name: creature.name,
                        value: creature.id,
                    };
                }));
            },
        })
        creatureId: string,
        interaction: CommandInteraction
    ) {
        // Show the bot thinking
        await interaction.deferReply({ ephemeral: false });

        // Get the creature
        const creature = await prisma.creature.findUnique({
            where: {
                id: creatureId,
            }
        });

        // If the creature doesn't exist
        if (!creature) {
            // Respond with the result
            await interaction.editReply({
                embeds: [{
                    title: 'Creature',
                    description: 'That creature doesn\'t exist.'
                }],
            });
            return;
        }

        // Get the number of times the user has encountered the creature
        const previousEncounterCount = await prisma.encounter.count({
            where: {
                creature: {
                    id: creature.id
                },
                guildMember: {
                    id: interaction.member?.user.id
                }
            }
        });

        // Respond with the result
        await interaction.editReply({
            embeds: [{
                title: 'Creature',
                fields: [{
                    name: 'NAME',
                    value: creature.name,
                    inline: true,
                }, {
                    name: 'HEALTH',
                    value: String(creature.health),
                    inline: true,
                }, {
                    name: 'DAMAGE',
                    value: String(creature.damage),
                    inline: true,
                }, {
                    name: 'PREVIOUSLY ENCOUNTERED',
                    value: String(previousEncounterCount),
                    inline: true,
                }],
            }],
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
        const levelProgress = levelService.getLevelProgress(user.xp);

        // Send the balance
        await interaction.editReply({
            embeds: [{
                author: {
                    name: `${interaction.member?.user.username}'s profile`,
                    icon_url: interaction.user.avatarURL() ?? undefined
                },
                title: 'Player',
                fields: [{
                    name: 'PROGRESS',
                    value: outdent`
                        **Level:** ${levelService.convertXpToLevel(user.xp)}
                        **XP:** ${user.xp - currentLevelXp}/${currentLevelXp} (${levelProgress}%)
                        ${emojibar(levelProgress)}
                    `,
                    inline: false,
                }, {
                    name: 'STATS',
                    value: outdent`
                        🏋️ **Strength:** ${user.strength}
                        🦓 **Dexterity:** ${user.dexterity}
                        🧠 **Intelligence:** ${user.intelligence}
                        📖 **Wisdom:** ${user.wisdom}
                        😎 **Charisma:** ${user.charisma}
                        🍀 **Luck:** ${user.luck}
                    `,
                    inline: false,
                }, {
                    name: 'SKILLS',
                    value: outdent`
                        🪓 **Woodcutting:** ${user.woodcutting - levelService.getCurrentLevelXp(user.woodcutting)}/${levelService.getCurrentLevelXp(user.woodcutting)}
                        ⛏️ **Mining:** ${user.mining - levelService.getCurrentLevelXp(user.mining)}/${levelService.getCurrentLevelXp(user.mining)}
                        🌾 **Farming:** ${user.farming - levelService.getCurrentLevelXp(user.farming)}/${levelService.getCurrentLevelXp(user.farming)}
                        🎣 **Fishing:** ${user.fishing - levelService.getCurrentLevelXp(user.fishing)}/${levelService.getCurrentLevelXp(user.fishing)}
                        👩‍🍳 **Cooking:** ${user.cooking - levelService.getCurrentLevelXp(user.cooking)}/${levelService.getCurrentLevelXp(user.cooking)}
                        ⚒️ **Smithing:** ${user.smithing - levelService.getCurrentLevelXp(user.smithing)}/${levelService.getCurrentLevelXp(user.smithing)}
                        🧵 **Crafting:** ${user.crafting - levelService.getCurrentLevelXp(user.crafting)}/${levelService.getCurrentLevelXp(user.crafting)}
                        🧪 **Alchemy:** ${user.alchemy - levelService.getCurrentLevelXp(user.alchemy)}/${levelService.getCurrentLevelXp(user.alchemy)}
                        🧩 **Enchanting:** ${user.enchanting - levelService.getCurrentLevelXp(user.enchanting)}/${levelService.getCurrentLevelXp(user.enchanting)}
                        🧙‍♂️ **Summoning:** ${user.summoning - levelService.getCurrentLevelXp(user.summoning)}/${levelService.getCurrentLevelXp(user.summoning)}
                        💃 **Performing:** ${user.performing - levelService.getCurrentLevelXp(user.performing)}/${levelService.getCurrentLevelXp(user.performing)}
                        🥷 **Stealth:** ${user.stealth - levelService.getCurrentLevelXp(user.stealth)}/${levelService.getCurrentLevelXp(user.stealth)}
                        📖 **Research:** ${user.research - levelService.getCurrentLevelXp(user.research)}/${levelService.getCurrentLevelXp(user.research)}
                    `,
                    inline: false,
                }, {
                    name: 'MONEY',
                    value: outdent`
                        <:coins:1083037299220152351> **Coins:** ${Intl.NumberFormat().format(user?.coins)}
                        🏦 **Bank:** 0
                    `,
                    inline: true,
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
