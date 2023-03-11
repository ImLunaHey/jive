import { GuildMemberGuard } from '@app/common/create-guild-member';
import { prisma } from '@app/common/prisma-client';
import { levelService } from '@app/features/leveling/service';
import { globalLogger } from '@app/logger';
import { Attack, EntityType, ItemSubType, ItemType, Location, Rarity, Slot } from '@prisma/client';
import { ActionRowBuilder, AnySelectMenuInteraction, ApplicationCommandOptionType, ButtonBuilder, ButtonInteraction, ButtonStyle, Colors, CommandInteraction, GuildMember, StringSelectMenuBuilder, StringSelectMenuInteraction } from 'discord.js';
import { ButtonComponent, Discord, Guard, SelectMenuComponent, Slash, SlashOption } from 'discordx';
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
export class Feature {
    private logger = globalLogger.scope('Economy');

    constructor() {
        this.logger.success('Feature initialized');
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

        // Get the user
        const user = await prisma.guildMember.findUnique({
            where: {
                id: interaction.member?.user.id
            }, include: {
                encounter: {
                    include: {
                        creatures: {
                            include: {
                                template: true
                            }
                        }
                    }
                }
            }
        });
        if (!user) return;

        // Check if the user is already exploring
        if (user.encounter) {
            // Respond with their encounter
            await interaction.editReply({
                embeds: [{
                    title: 'Encounter',
                    description: outdent`
                        You rejoin the battle against ${user.encounter.creatures.map(creature => creature.name).join(', ')}.
                        Their health is at ${emojibar(user.encounter.creatures.reduce((a, b) => a + b.health, 0), { maxValue: user.encounter.creatures.reduce((a, b) => a + b.template.health, 0) })}.
                    `,
                    footer: {
                        text: `Encounter ID: ${user.encounter.id}`
                    }
                }],
                components: [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents([
                            new ButtonBuilder()
                                .setCustomId('encounter-button-melee-attack')
                                .setLabel('Punch')
                                .setStyle(ButtonStyle.Primary),
                            // new ButtonBuilder()
                            //     .setCustomId('encounter-ranged-attack')
                            //     .setLabel('Throw a rock')
                            //     .setStyle(ButtonStyle.Primary),
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

            return;
        }

        // Grab a list of creatures that can be encountered in this area
        const creatures = await prisma.creatureTemplate.findMany({
            where: {
                location: user.location
            }
        });

        // Check if we found a creature
        if (creatures.length === 0) {
            await interaction.editReply({
                embeds: [{
                    title: 'Explore',
                    description: `You explore ${user.location}, but you don\'t find anything.`
                }]
            });

            return;
        }

        // Get a random amount of creatures
        const creatureCount = Math.floor(Math.random() * 3) + 1;
        const encounterCreatures = Array.from({ length: creatureCount }, () => creatures[Math.floor(Math.random() * creatures.length)]);

        // Save the encounter
        const encounter = await prisma.encounter.create({
            data: {
                location: user.location,
                creatures: {
                    createMany: {
                        data: encounterCreatures.map(createTemplate => ({
                            health: createTemplate.health,
                            name: createTemplate.name,
                            attack: createTemplate.attack,
                            defence: createTemplate.defence,
                            templateId: createTemplate.id,
                        })),
                    },
                },
                guild: {
                    connect: {
                        id: interaction.guild.id
                    }
                },
                guildMembers: {
                    connect: {
                        id: interaction.member?.user.id
                    }
                },
            }
        });

        // Respond with their encounter
        await interaction.editReply({
            embeds: [{
                title: 'Encounter',
                description: outdent`
                    You encounter ${encounterCreatures.map(creature => creature.name).join(', ')}.
                    Their total health is ${encounterCreatures.map(creature => creature.health).reduce((a, b) => a + b, 0)}. ${emojibar(100)}
                `,
                footer: {
                    text: `Encounter ID: ${encounter.id}`
                }
            }],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId('encounter-battle-start')
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

    async isUserTurn(interaction: ButtonInteraction | AnySelectMenuInteraction, encounterId: string) {
        // Get the encounter
        const encounter = await prisma.encounter.findUnique({
            where: {
                id: encounterId
            },
            include: {
                initatives: true,
            },
        });

        // Check if we found an encounter
        if (!encounter) {
            await interaction.reply({
                ephemeral: true,
                embeds: [{
                    title: 'Encounter',
                    description: 'You are not in an encounter.'
                }]
            });
            return false;
        }

        // // Check if it's the user's turn
        // const initiative = encounter.initatives[0].entityType === EntityType.GUILD_MEMBER && encounter.initatives[0].entityId === interaction.member?.user.id;
        // if (!initiative) {
        //     await interaction.reply({
        //         ephemeral: true,
        //         embeds: [{
        //             title: 'Encounter',
        //             description: 'It\'s not your turn.'
        //         }]
        //     });
        //     return false;
        // }

        // It's the user's turn
        return true;
    }

    async checkForTheDead(encounterId: string, interaction: ButtonInteraction | AnySelectMenuInteraction) {
        // Get the encounter
        const encounter = await prisma.encounter.findUnique({
            where: {
                id: encounterId
            },
            include: {
                creatures: {
                    include: {
                        template: true,
                    },
                },
                guildMembers: true,
            },
        });
        if (!encounter) return;

        // Check if either team is dead
        const deadCreatures = encounter.creatures.filter(creature => creature.health <= 0);
        const deadGuildMembers = encounter.guildMembers.filter(guildMember => guildMember.health <= 0);

        // Check if the encounter is over
        if (deadCreatures.length === encounter.creatures.length || deadGuildMembers.length === encounter.guildMembers.length) {
            // End the encounter
            await prisma.encounter.update({
                where: {
                    id: encounter.id,
                },
                data: {
                    end: new Date(),
                    guildMembers: {
                        set: [],
                    },
                    previousGuildMembers: {
                        set: encounter.guildMembers.map(guildMember => ({ id: guildMember.id }))
                    }
                },
            });

            // Respond with the end of the encounter
            await interaction.update({
                embeds: [{
                    title: 'Encounter',
                    description: outdent`
                        ${deadCreatures.length === encounter.creatures.length ? 'You have defeated the creatures.' : 'The creatures have defeated you.'}

                        Damage dealt to creatures:
                        ${encounter.creatures.map(creature => `${creature.name}: ${creature.template.health - creature.health}`).join('\n')}

                        Damage dealt to guild members:
                        ${encounter.guildMembers.map(guildMember => `<@${guildMember.id}>: ${100 - guildMember.health}`).join('\n')}
                    `,
                    footer: {
                        text: `Encounter ID: ${encounter.id}`
                    }
                }],
                components: []
            });

            return true;
        }

        return false;
    }

    async handleBattleLoop(interaction: ButtonInteraction | StringSelectMenuInteraction, encounterId: string) {
        // For each initative, go through the list and have them take their turn
        // If they are a creature, they will attack a random member of the party
        // If they are a guild member, we need to show them a list of actions they can take
        // If they are a guild member, they can attack, use an item, or run
        // If they attack, they will attack the creature they select (or a random one if they don't select one)
        // If they use an item, they will use the item they select
        // If they run, they will run away from the encounter

        const encounter = await prisma.encounter.findUnique({
            where: {
                id: encounterId,
            },
            include: {
                creatures: {
                    include: {
                        template: true,
                    },
                },
                guildMembers: true,
                initatives: true,
            }
        });

        // @TODO: Handle this
        if (!encounter) return;

        // @TODO: Handle this
        if (encounter?.initatives.length === 0) return;

        // Check if the encounter is over
        if (await this.checkForTheDead(encounter.id, interaction)) return;

        // Remove the turns that have already happened
        const initatives = encounter.initatives.slice(encounter.turn);

        // Loop through each initative
        for (const initiative of initatives) {
            // Increment the turn
            await prisma.encounter.update({
                where: {
                    id: encounter.id,
                },
                data: {
                    turn: {
                        increment: 1,
                    },
                },
            });

            // Check if the encounter is over
            if (await this.checkForTheDead(encounter.id, interaction)) break;

            if (initiative.entityType === EntityType.CREATURE) {
                // Get the creature
                const creature = encounter.creatures.find(creature => creature.id === initiative.entityId)!;

                // Get a random guild member
                const guildMember = encounter.guildMembers[Math.floor(Math.random() * encounter.guildMembers.length)];

                // Get the damage done
                const damage = creature.attack >= guildMember.health ? guildMember.health : creature.attack;

                // Attack the guild member
                await prisma.guildMember.update({
                    where: {
                        id: guildMember.id,
                    },
                    data: {
                        health: {
                            decrement: damage,
                        },
                    },
                });

                // Save the attack event
                await prisma.encounter.update({
                    where: {
                        id: encounter.id,
                    },
                    data: {
                        attacks: {
                            create: {
                                attackerId: creature.id,
                                attackerType: EntityType.CREATURE,
                                defenderId: guildMember.id,
                                defenderType: EntityType.GUILD_MEMBER,
                                damage,
                            },
                        },
                    },
                });
            } else if (initiative.entityType === EntityType.GUILD_MEMBER) {
                // Get the guild member
                const guildMember = encounter.guildMembers.find(guildMember => guildMember.id === initiative.entityId)!;

                // Get the next initative
                const nextInitiative = encounter.initatives[encounter.turn + 1] ?? encounter.initatives[0];

                // Show them a list of actions they can take
                await interaction.update({
                    embeds: [{
                        title: 'Encounter',
                        fields: [{
                            name: 'Current turn',
                            value: `<@${guildMember.id}>`,
                            inline: true,
                        }, {
                            name: 'Next turn',
                            value: nextInitiative.entityType === EntityType.CREATURE
                                ? encounter.creatures.find(creature => creature.id === nextInitiative.entityId)!.name :
                                `<@${encounter.guildMembers.find(guildMember => guildMember.id === nextInitiative.entityId)!.id}>`,
                            inline: true,
                        }, {
                            name: 'Party',
                            value: encounter.guildMembers.map(guildMember => `<@${guildMember.id}>: ${guildMember.health}`).join('\n'),
                        }, {
                            name: 'Creatures',
                            value: encounter.creatures.map(creature => `${creature.name}: ${creature.health}`).join('\n'),
                        }],
                        footer: {
                            text: `Encounter ID: ${encounter.id}`
                        }
                    }],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>()
                            .addComponents([
                                new ButtonBuilder()
                                    .setCustomId('encounter-button-melee-attack')
                                    .setLabel('Punch')
                                    .setStyle(ButtonStyle.Primary),
                                // new ButtonBuilder()
                                //     .setCustomId('encounter-ranged-attack')
                                //     .setLabel('Throw a rock')
                                //     .setStyle(ButtonStyle.Primary),
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

                // Exit the loop
                break;
            }
        }

        // If there are no more initatives, reset the turn
        if (encounter.initatives.length === encounter.turn) {
            await prisma.encounter.update({
                where: {
                    id: encounter.id
                },
                data: {
                    turn: 0
                }
            });

            // Start the loop again
            await this.handleBattleLoop(interaction, encounterId);
        }
    }

    @ButtonComponent({
        id: 'encounter-battle-start',
    })
    async battleStart(
        interaction: ButtonInteraction,
    ) {
        if (!interaction.guild?.id) return;
        if (!interaction.member?.user.id) return;

        // Get the encounter
        const encounter = await prisma.encounter.findFirst({
            where: {
                guildMembers: {
                    some: {
                        id: interaction.member?.user.id
                    }
                }
            },
            include: {
                creatures: true,
                guild: true,
                guildMembers: true
            }
        });
        if (!encounter) return;

        // Get the user's details
        const user = await prisma.guildMember.findUnique({ where: { id: interaction.member?.user.id } });
        if (!user) return;

        // Roll initative for everyone
        const guildMembersInitative = encounter.guildMembers.map(member => ({
            entityType: EntityType.GUILD_MEMBER,
            entityId: member.id,
            roll: Math.floor(Math.random() * 20) + 1
        }));

        const creaturesInitiative = encounter.creatures.map(creature => ({
            entityType: EntityType.CREATURE,
            entityId: creature.id,
            roll: Math.floor(Math.random() * 20) + 1,
        }));

        // Sort the initiative
        const initiatives = [...guildMembersInitative, ...creaturesInitiative].sort((a, b) => b.roll - a.roll).map((initiative, index) => ({
            ...initiative,
            order: index
        }));

        // Update the encounter
        await prisma.encounter.update({
            where: {
                id: encounter.id
            },
            data: {
                initatives: {
                    createMany: {
                        data: initiatives
                    }
                }
            }
        });

        // Start the battle loop
        await this.handleBattleLoop(interaction, encounter.id);
    }

    @ButtonComponent({
        id: 'encounter-button-melee-attack',
    })
    async buttonMeleeAttack(
        interaction: ButtonInteraction,
    ) {
        if (!interaction.guild?.id) return;
        if (!interaction.member?.user.id) return;

        // Get the encounter
        const encounter = await prisma.encounter.findFirst({
            where: {
                guildMembers: {
                    some: {
                        id: interaction.member?.user.id,
                    },
                },
            },
            include: {
                creatures: {
                    where: {
                        health: {
                            gt: 0,
                        },
                    },
                    include: {
                        template: true,
                    },
                },
            },
        });
        if (!encounter) return;

        // Check if it's the user's turn
        if (!await this.isUserTurn(interaction, encounter.id)) return;

        // Show the user a list of creatures
        const creatures = encounter.creatures.map(creature => ({
            label: `${creature.name} (${creature.health}/${creature.template.health} HP) - ATK: ${creature.template.attack} DEF: ${creature.template.defence}`,
            value: creature.id
        }));

        // Show them a list of actions they can take
        await interaction.update({
            embeds: [{
                title: 'Encounter',
                fields: [{
                    name: 'Turn',
                    value: `<@${interaction.member?.user.id}>`,
                }],
                footer: {
                    text: `Encounter ID: ${encounter.id}`
                }
            }],
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents([
                        new StringSelectMenuBuilder()
                            .setCustomId('encounter-select-melee-attack')
                            .setPlaceholder('Select a creature')
                            .addOptions(creatures)
                    ])
            ]
        });
    }

    @SelectMenuComponent({
        id: 'encounter-select-melee-attack',
    })
    async meleeAttack(
        interaction: StringSelectMenuInteraction,
    ) {
        if (!interaction.guild?.id) return;
        if (!interaction.member?.user.id) return;

        // Get the encounter
        const encounter = await prisma.encounter.findFirst({
            where: {
                guildMembers: {
                    some: {
                        id: interaction.member?.user.id
                    }
                }
            },
            include: {
                initatives: true,
            }
        });
        if (!encounter) return;

        // Check if it's the user's turn
        if (!await this.isUserTurn(interaction, encounter.id)) return;

        // Get the user's weapon
        const weapon = await prisma.item.findFirst({
            where: {
                ownerId: interaction.member?.user.id,
                equipped: true,
                slot: Slot.MAIN_HAND,
                type: ItemType.WEAPON,
                subType: ItemSubType.FIST,
            },
        });

        // Get the creature
        const creature = await prisma.creature.findFirst({
            where: {
                id: interaction.values[0]
            }
        });

        // If the creature doesn't exist, return
        if (!creature) {
            await interaction.update({
                embeds: [{
                    title: 'Encounter',
                    description: 'That creature doesn\'t exist',
                    footer: {
                        text: `Encounter ID: ${encounter.id}`
                    }
                }],
                components: []
            });
            return;
        }

        // Attack the creature
        await prisma.creature.update({
            where: {
                id: interaction.values[0]
            },
            data: {
                health: {
                    decrement: weapon?.damage ?? 1
                }
            }
        });

        // Update the encounter
        await prisma.encounter.update({
            where: {
                id: encounter.id
            },
            data: {
                turn: {
                    increment: 1
                },
                attacks: {
                    create: {
                        attackerId: interaction.member?.user.id,
                        attackerType: EntityType.GUILD_MEMBER,
                        defenderId: interaction.values[0],
                        defenderType: EntityType.CREATURE,
                        damage: weapon?.damage ?? 1,
                    }
                }
            }
        });

        // Start the battle loop
        await this.handleBattleLoop(interaction, encounter.id);
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
                guildMembers: {
                    some: {
                        id: interaction.member?.user.id
                    }
                }
            },
            include: {
                creatures: true,
                guild: true,
                guildMembers: true
            }
        });

        // If there is no encounter
        if (!encounter) {
            // Respond with the result
            await interaction.reply({
                ephemeral: true,
                embeds: [{
                    title: 'Encounter',
                    description: 'You aren\'t in this encounter.',
                }],
                components: []
            });
            return;
        }

        // // Check if the battle has started
        // if (encounter.turn !== 0) {
        //     // Check if it's the user's turn
        //     if (!await this.isUserTurn(interaction, encounter.id)) {
        //         // Respond with the result
        //         await interaction.reply({
        //             ephemeral: true,
        //             embeds: [{
        //                 title: 'Encounter',
        //                 description: 'It\'s not your turn.',
        //             }],
        //             components: []
        //         });
        //         return;
        //     }
        // }

        // Update the encounter
        await prisma.encounter.update({
            where: {
                id: encounter.id,
            },
            data: {
                end: new Date(),
                guildMembers: {
                    disconnect: {
                        id: interaction.member?.user.id,
                    },
                },
                previousGuildMembers: {
                    connect: {
                        id: interaction.member?.user.id,
                    },
                },
            },
        });

        // Respond with the result
        await interaction.update({
            embeds: [{
                title: 'Encounter',
                description: 'You run away from the encounter.',
                footer: {
                    text: `Encounter ID: ${encounter.id}`
                }
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
                guildMembers: {
                    some: {
                        id: interaction.member?.user.id,
                    },
                },
            },
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
        name: 'travel',
        description: 'Travel to a new location',
    })
    async travel(
        @SlashOption({
            name: 'location',
            description: 'The location to travel to',
            required: true,
            type: ApplicationCommandOptionType.String,
            async autocomplete(interaction) {
                const selected = interaction.options.getString('location');
                const locations = selected ? Object.values(Location).filter(location => location.startsWith(selected)) : Object.values(Location);
                await interaction.respond(locations.slice(0, 25).map(location => {
                    return {
                        name: location,
                        value: location,
                    };
                }));
            },
        })
        locationId: string,
        interaction: CommandInteraction
    ) {
        // Show the bot thinking
        await interaction.deferReply({ ephemeral: false });

        // Get the user
        const user = await prisma.guildMember.findUnique({
            where: {
                id: interaction.member?.user.id
            },
        });
        if (!user) return;

        // Don't allow travelling if the user's in an encounter
        if (user.encounterId) {
            // Respond with the result
            await interaction.editReply({
                embeds: [{
                    title: 'Travel',
                    description: 'You can\'t travel while in an encounter.',
                    color: Colors.Red,
                }],
            });
            return;
        }

        // Get the location
        const location = Location[locationId as keyof typeof Location];
        if (!location) {
            // Respond with the result
            await interaction.editReply({
                embeds: [{
                    title: 'Travel',
                    description: 'That location doesn\'t exist.',
                }],
            });
            return;
        }

        // Check if the user is already in the location
        if (user.location === location) {
            // Respond with the result
            await interaction.editReply({
                embeds: [{
                    title: 'Travel',
                    description: 'You are already in that location.',
                    color: Colors.Red,
                }],
            });
            return;
        }

        // Update the user's location
        await prisma.guildMember.update({
            where: {
                id: interaction.member?.user.id,
            },
            data: {
                location,
            },
        });

        // Respond with the result
        await interaction.editReply({
            embeds: [{
                title: 'Travel',
                description: `You travel to ${location}.`,
                color: Colors.Blue,
            }],
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
                const creatures = await prisma.creatureTemplate.findMany({
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

        // Get the creature template
        const creature = await prisma.creatureTemplate.findUnique({
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

        // Respond with the result
        await interaction.editReply({
            embeds: [{
                title: `${creature.emoji} ${creature.name}`,
                description: creature.description,
                thumbnail: {
                    url: creature.imageUrl ?? 'https://cdn.discordapp.com/embed/avatars/0.png',
                },
                fields: [{
                    name: 'NAME',
                    value: creature.name,
                    inline: true,
                }, {
                    name: 'HEALTH',
                    value: String(creature.health),
                    inline: true,
                }, {
                    name: 'ATTACK',
                    value: String(creature.attack),
                    inline: true,
                }, {
                    name: 'DEFENCE',
                    value: String(creature.defence),
                    inline: true,
                }, {
                    name: 'LOCATION',
                    value: creature.location,
                    inline: true,
                }, {
                    name: 'RARITY',
                    value: creature.rarity,
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
                        🗺️ **Location:** ${user.location}
                        💗 **Health:** ${user.health}

                        🏋️ **Strength:** ${user.strength}
                        🦓 **Dexterity:** ${user.dexterity}
                        🧠 **Intelligence:** ${user.intelligence}
                        ❣️ **Constitution:** ${user.constitution}
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
                                id: interaction.guild.id,
                            },
                        },
                    },
                    update: {
                        coins: {
                            increment: amount,
                        },
                    },
                }),
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
    //                     defence: item.defence,
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
