import { GuildMemberGuard } from '@app/common/create-guild-member';
import { globalLogger } from '@app/logger';
import { Discord, Guard } from 'discordx';

// const coinEmoji = '<:coins:1083037299220152351>';

// const emojiBar = (value: number, options?: {
//     bars?: {
//         full: {
//             start: string;
//             bar: string;
//             end: string;
//         };
//         empty: {
//             start: string;
//             bar: string;
//             end: string;
//         };
//     };
//     maxValue?: number;
//     size?: number;
// }) => {
//     const bars = options?.bars ?? {
//         full: {
//             start: '<:lb_g:1083768174383726673>',
//             bar: '<:l_g:1083768215324340344>',
//             end: '<:lb4_g:1083768231346577509>',
//         },
//         empty: {
//             start: '<:lb2_g:1083768151629635604>',
//             bar: '<:l2_g:1083768196236050442>',
//             end: '<:lb3_g:1083768245489778798>',
//         },
//     };
//     const maxValue = options?.maxValue ?? 100;
//     const size = options?.size ?? 5;
//     const bar = [];
//     const full = Math.round(size * (value / maxValue > 1 ? 1 : value / maxValue));
//     const empty = size - full > 0 ? size - full : 0;
//     for (let i = 1; i <= full; i++) bar.push(bars.full.bar);
//     for (let i = 1; i <= empty; i++) bar.push(bars.empty.bar);
//     bar[0] = bar[0] == bars.full.bar ? bars.full.start : bars.empty.start;
//     bar[bar.length - 1] = bar[bar.length - 1] == bars.full.bar ? bars.full.end : bars.empty.end;
//     return bar.join('');
// };

// const capitalise = (string: string) => string && string[0].toUpperCase() + string.slice(1);
// const locationAutoComplete = async (interaction: AutocompleteInteraction) => {
//     const selected = interaction.options.getString('location')?.toLowerCase();
//     const filteredLocations = (selected ? Locations.filter(location => location.toLowerCase().startsWith(selected)) : Locations).slice(0, 25);
//     const selectedLocations = await Promise.all(filteredLocations.map(async location => ({
//         location,
//         count: await db
//             .selectFrom('creature_templates')
//             .select(db.fn.count<number>('id').as('count'))
//             .where('location', '=', location)
//             .executeTakeFirst().then(_ => _?.count ?? 0)
//     })));

//     const locations = selectedLocations
//         .filter(({ count }) => count >= 1)
//         .map(({ location, count }) => {
//             return {
//                 name: `${capitalise(location.toLowerCase())} [${count} creatures]`,
//                 value: location,
//             };
//         });

//     await interaction.respond(locations);
// };

@Discord()
@Guard(GuildMemberGuard)
export class Feature {
    private logger = globalLogger.child({ service: 'Economy' });

    constructor() {
        this.logger.info('Initialised');
    }

    // @Slash({
    //     name: 'beg',
    //     description: 'Beg for coins',
    // })
    // async beg(
    //     interaction: CommandInteraction
    // ) {
    //     if (!interaction.guild?.id) return;
    //     if (!interaction.member?.user.id) return;

    //     // Show the bot thinking
    //     await interaction.deferReply({ ephemeral: false });

    //     // Get the user's balance
    //     const user = await db
    //         .selectFrom('guild_members')
    //         .select('coins')
    //         .where('id', '=', interaction.user.id)
    //         .executeTakeFirst();

    //     // Get the user's balance
    //     const balance = user?.coins ?? 0;

    //     // If the user has too much money, don't let them beg
    //     if (balance >= 100) {
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Beg',
    //                 description: 'You try to beg, but nobody gives you any money. You\'re too rich for that.'
    //             }]
    //         });
    //     }

    //     // Generate a random number between 0 and 100
    //     const random = Math.floor(Math.random() * 100);

    //     // Otherwise, let them beg
    //     await db
    //         .updateTable('guild_members')
    //         .set(eb => ({
    //             coins: eb.bxp('coins', '+', random),
    //         }))
    //         .execute();

    //     // Send the balance
    //     await interaction.editReply({
    //         embeds: [{
    //             title: 'Beg',
    //             description: `You beg for money and get \`${random}\` coins. You now have \`${balance + random}\` coins.`
    //         }]
    //     });
    // }

    // /**
    //  * Check if the user is exploring
    //  * If so respond with their encounter
    //  * @param interaction Command interaction
    //  * @returns 
    //  */
    // async isExploring(interaction: ButtonInteraction | CommandInteraction | StringSelectMenuInteraction) {
    //     if (!interaction.member?.user.id) return;

    //     // Get the user's encounter
    //     const encounter = await db
    //         .transaction()
    //         .execute(async trx => {
    //             const encounter = await trx
    //                 .selectFrom('encounters')
    //                 .select('id')
    //                 .select('turn')
    //                 .select('guildMembers')
    //                 .where('id', '=', interaction.user.id)
    //                 .executeTakeFirst();

    //             if (!encounter) return;

    //             return {
    //                 ...encounter,
    //                 guildMembers: await Promise.all((encounter?.guildMembers ?? []).map(async guildMemberId => {
    //                     return trx
    //                         .selectFrom('guild_members')
    //                         .select('health')
    //                         .where('id', '=', guildMemberId)
    //                         .executeTakeFirstOrThrow();
    //                 }))
    //             }
    //         });

    //     // Check if they're in an encounter
    //     if (!encounter) return false;

    //     // Get the encounter's initiatives
    //     const initiatives = await db
    //         .selectFrom('initiatives')
    //         .where('encounterId', '=', encounter.id)
    //         .execute();

    //     // Get the encounter's creates
    //     const creatures = await db
    //         .selectFrom('creatures')
    //         .select('name')
    //         .select('health')
    //         .innerJoin('creature_templates', 'creature_templates.id', 'templateId')
    //         .select('creature_templates.health as templateHealth')
    //         .where('encounterId', '=', encounter.id)
    //         .execute();

    //     // Respond with their encounter
    //     await interaction.editReply({
    //         embeds: [{
    //             title: `Encounter [${encounter.turn}/${initiatives.length}]`,
    //             description: outdent`
    //                 You rejoin the battle against ${creatures.map(creature => creature.name).join(', ')}.
    //                 Their health is at ${emojiBar(creatures.reduce((a, b) => a + b.health, 0), { maxValue: creatures.reduce((a, b) => a + b.templateHealth, 0) })}.
    //             `,
    //             fields: [{
    //                 name: 'Current turn',
    //                 value: `<@${interaction.user.id}>`,
    //                 inline: true,
    //                 // }, {
    //                 //     name: 'Next turn',
    //                 //     value: nextInitiative.entityType === EntityType.CREATURE
    //                 //         ? user.encounter.creatures.find(creature => creature.id === nextInitiative.entityId)!.name :
    //                 //         `<@${user.encounter.guildMembers.find(guildMember => guildMember.id === nextInitiative.entityId)!.id}>`,
    //                 //     inline: true,
    //             }, {
    //                 name: 'Party',
    //                 value: encounter.guildMembers.map(guildMember => `<@${guildMember.id}>: ${guildMember.health}`).join('\n'),
    //             }, {
    //                 name: 'Creatures',
    //                 value: creatures.map(creature => `${creature.name}: ${creature.health}`).join('\n'),
    //             }],
    //             footer: {
    //                 text: `Encounter ID: ${encounter.id}`
    //             }
    //         }],
    //         components: [
    //             new ActionRowBuilder<ButtonBuilder>()
    //                 .addComponents([
    //                     new ButtonBuilder()
    //                         .setCustomId('encounter-button-melee-attack')
    //                         .setLabel('Punch')
    //                         .setStyle(ButtonStyle.Primary),
    //                     new ButtonBuilder()
    //                         .setCustomId('encounter-button-ranged-attack')
    //                         .setLabel('Throw a rock')
    //                         .setStyle(ButtonStyle.Primary),
    //                 ]),
    //             new ActionRowBuilder<ButtonBuilder>()
    //                 .addComponents([
    //                     new ButtonBuilder()
    //                         .setCustomId('encounter-run')
    //                         .setLabel('Run')
    //                         .setEmoji('🏃')
    //                         .setStyle(ButtonStyle.Secondary),
    //                     new ButtonBuilder()
    //                         .setCustomId('encounter-inventory')
    //                         .setLabel('Inventory')
    //                         .setEmoji('🎒')
    //                         .setStyle(ButtonStyle.Secondary)
    //                 ])
    //         ]
    //     });

    //     // Return true to indicate that the user is already exploring
    //     return true;
    // }

    // @Slash({
    //     name: 'explore',
    //     description: 'Explore the world',
    // })
    // async explore(
    //     interaction: CommandInteraction,
    // ) {
    //     if (!interaction.guild?.id) return;
    //     if (!interaction.member?.user.id) return;

    //     // Show the bot thinking
    //     await interaction.deferReply({ ephemeral: false });

    //     // Check if the user is already exploring
    //     if (await this.isExploring(interaction)) return;

    //     // Get the user
    //     const user = await db
    //         .selectFrom('guild_members')
    //         .select('location')
    //         .where('id', '=', interaction.user.id)
    //         .executeTakeFirst();

    //     if (!user) return;

    //     // Grab a list of creatures that can be encountered in this area
    //     const creatures = await db
    //         .selectFrom('creature_templates')
    //         .select('id')
    //         .select('health')
    //         .select('name')
    //         .select('attack')
    //         .select('defence')
    //         .where('location', '=', user.location)
    //         .execute();

    //     // Check if we found a creature
    //     if (creatures.length === 0) {
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Explore',
    //                 description: `You explore ${user.location}, but you don\'t find anything.`
    //             }]
    //         });

    //         return;
    //     }

    //     // Get a random amount of creatures
    //     const creatureCount = Math.floor(Math.random() * 3) + 1;
    //     const encounterCreatures = Array.from({ length: creatureCount }, () => creatures[Math.floor(Math.random() * creatures.length)]);

    //     // Save the encounter
    //     const encounterId = randomUUID();
    //     await db
    //         .insertInto('encounters')
    //         .values({
    //             id: encounterId,
    //             guildId: interaction.guild.id,
    //             guildMembers: json([
    //                 interaction.user.id,
    //             ]),
    //             location: user.location,
    //             start: new Date(),
    //             turn: 0,
    //         })
    //         .execute();

    //     // Create the creatures for this encounter
    //     await db
    //         .insertInto('creatures')
    //         .values(encounterCreatures.map(createTemplate => ({
    //             health: createTemplate.health,
    //             name: createTemplate.name,
    //             attack: createTemplate.attack,
    //             defence: createTemplate.defence,
    //             templateId: createTemplate.id,
    //             encounterId,
    //             id: randomUUID(),
    //         })))
    //         .execute();

    //     // Fetch the newly created encounter
    //     const encounter = await db
    //         .selectFrom('encounters')
    //         .select('turn')
    //         .select('guildMembers')
    //         .select('creatures')
    //         .innerJoin('guild_members', 'id', 'guildMembers')
    //         .executeTakeFirstOrThrow();

    //     // Fetch the initiatives
    //     const initiatives = await db
    //         .selectFrom('initiatives')
    //         .execute();

    //     // Respond with their encounter
    //     await interaction.editReply({
    //         embeds: [{
    //             title: `Encounter [${encounter.turn}/${initiatives.length}]`,
    //             description: outdent`
    //                 You encounter ${encounterCreatures.map(creature => creature.name).join(', ')}.
    //                 Their total health is ${encounterCreatures.map(creature => creature.health).reduce((a, b) => a + b, 0)}. ${emojiBar(100)}
    //             `,
    //             fields: [{
    //                 name: 'Party',
    //                 value: encounter.guildMembers.map(guildMember => `<@${guildMember.id}>: ${guildMember.health}`).join('\n'),
    //             }, {
    //                 name: 'Creatures',
    //                 value: encounter.creatures.map(creature => `${creature.name}: ${creature.health}`).join('\n'),
    //             }],
    //             footer: {
    //                 text: `Encounter ID: ${encounter.id}`
    //             }
    //         }],
    //         components: [
    //             new ActionRowBuilder<ButtonBuilder>()
    //                 .addComponents([
    //                     new ButtonBuilder()
    //                         .setCustomId('encounter-battle-start')
    //                         .setLabel('Start battle')
    //                         .setStyle(ButtonStyle.Primary),
    //                 ]),
    //             new ActionRowBuilder<ButtonBuilder>()
    //                 .addComponents([
    //                     new ButtonBuilder()
    //                         .setCustomId('encounter-run')
    //                         .setLabel('Run')
    //                         .setEmoji('🏃')
    //                         .setStyle(ButtonStyle.Secondary),
    //                     new ButtonBuilder()
    //                         .setCustomId('encounter-inventory')
    //                         .setLabel('Inventory')
    //                         .setEmoji('🎒')
    //                         .setStyle(ButtonStyle.Secondary)
    //                 ])
    //         ]
    //     });
    // }

    // async isUserTurn(interaction: ButtonInteraction | AnySelectMenuInteraction, encounterId: string) {
    //     // Get the encounter
    //     const encounter = await prisma.encounter.findUnique({
    //         where: {
    //             id: encounterId
    //         },
    //         include: {
    //             initiatives: true,
    //         },
    //     });

    //     // Check if we found an encounter
    //     if (!encounter) {
    //         await interaction.reply({
    //             ephemeral: true,
    //             embeds: [{
    //                 title: 'Encounter',
    //                 description: 'You are not in an encounter.'
    //             }]
    //         });
    //         return false;
    //     }

    //     // // Check if it's the user's turn
    //     // const initiative = encounter.initiatives[0].entityType === EntityType.GUILD_MEMBER && encounter.initiatives[0].entityId === interaction.member?.user.id;
    //     // if (!initiative) {
    //     //     await interaction.reply({
    //     //         ephemeral: true,
    //     //         embeds: [{
    //     //             title: `Encounter [${encounter.turn}/${encounter.initiatives.length}]`,
    //     //             description: 'It\'s not your turn.'
    //     //         }]
    //     //     });
    //     //     return false;
    //     // }

    //     // It's the user's turn
    //     return true;
    // }

    // async checkForTheDead(encounterId: string, interaction: ButtonInteraction | AnySelectMenuInteraction) {
    //     // Get the encounter
    //     const encounter = await prisma.encounter.findUnique({
    //         where: {
    //             id: encounterId
    //         },
    //         include: {
    //             creatures: {
    //                 include: {
    //                     template: {
    //                         include: {
    //                             lootTable: true
    //                         }
    //                     }
    //                 },
    //             },
    //             guildMembers: true,
    //             initiatives: true,
    //         },
    //     });
    //     if (!encounter) return;

    //     // Check if either team is dead
    //     const deadCreatures = encounter.creatures.filter(creature => creature.health <= 0);
    //     const deadGuildMembers = encounter.guildMembers.filter(guildMember => guildMember.health <= 0);

    //     // Check if the encounter is over
    //     if (deadCreatures.length === encounter.creatures.length || deadGuildMembers.length === encounter.guildMembers.length) {
    //         // End the encounter
    //         await prisma.encounter.update({
    //             where: {
    //                 id: encounter.id,
    //             },
    //             data: {
    //                 end: new Date(),
    //                 guildMembers: {
    //                     set: [],
    //                 },
    //                 previousGuildMembers: {
    //                     set: encounter.guildMembers.map(guildMember => ({ id: guildMember.id }))
    //                 }
    //             },
    //         });

    //         // Get the attacks
    //         const attacks = await prisma.attack.findMany({
    //             where: {
    //                 encounterId: encounter.id,
    //             },
    //         });

    //         // Get the total damage taken
    //         const getDamageTaken = (entityId: string) => attacks.filter(attack => attack.defenderId === entityId).reduce((a, b) => a + b.damage, 0);

    //         // Award items and XP
    //         const totalXpToGain = encounter.creatures.map(creature => creature.template.xp).reduce((a, b) => a + b, 0);
    //         const xpPerGuildMember = Math.floor(totalXpToGain / encounter.guildMembers.length);
    //         const lootTable = encounter.creatures.map(creature => creature.template.lootTable).filter(lootTable => lootTable !== null).flat();

    //         // Award XP
    //         await prisma.guildMember.updateMany({
    //             where: {
    //                 id: {
    //                     in: encounter.guildMembers.map(guildMember => guildMember.id)
    //                 }
    //             },
    //             data: {
    //                 xp: {
    //                     increment: xpPerGuildMember,
    //                 }
    //             }
    //         });

    //         // Award loot
    //         for (const guildMember of encounter.guildMembers) {
    //             const itemTemplate = lootTable[Math.floor(Math.random() * lootTable.length)];
    //             if (itemTemplate) {
    //                 // Ensure items are stacked
    //                 await prisma.$transaction(async prisma => {
    //                     const hasItem = await prisma.item.findFirst({
    //                         where: {
    //                             ownerId: guildMember.id,
    //                             templateId: itemTemplate.id,
    //                         }
    //                     });

    //                     if (hasItem) {
    //                         // Add to the stack
    //                         await prisma.item.update({
    //                             where: {
    //                                 id: hasItem.id,
    //                             },
    //                             data: {
    //                                 quantity: {
    //                                     increment: 1,
    //                                 }
    //                             }
    //                         });
    //                     } else {
    //                         // Create a new item
    //                         await prisma.item.create({
    //                             data: {
    //                                 ownerId: guildMember.id,
    //                                 templateId: itemTemplate.id,
    //                                 description: itemTemplate.description,
    //                                 name: itemTemplate.name,
    //                                 type: itemTemplate.type,
    //                                 emoji: itemTemplate.emoji,
    //                                 price: itemTemplate.price,
    //                                 subType: itemTemplate.subType,
    //                                 slot: itemTemplate.slot,
    //                                 bonus: itemTemplate.bonus,
    //                                 chance: itemTemplate.chance,
    //                                 damage: itemTemplate.damage,
    //                                 cooldown: itemTemplate.cooldown,
    //                                 defence: itemTemplate.defence,
    //                                 heal: itemTemplate.heal,
    //                                 quantity: itemTemplate.quantity,
    //                                 rarity: itemTemplate.rarity,
    //                             }
    //                         });
    //                     }
    //                 });
    //             }
    //         }

    //         // Create the embed
    //         const embed = new EmbedBuilder({
    //             title: `Encounter [${encounter.turn}/${encounter.initiatives.length}]`,
    //             description: outdent`
    //                 ${deadCreatures.length === encounter.creatures.length ? 'You have defeated the creatures.' : 'The creatures have defeated you.'}

    //                 Damage dealt to creatures:
    //                 ${encounter.creatures.map(creature => `${creature.name}: ${getDamageTaken(creature.id)}`).join('\n')}

    //                 Damage dealt to guild members:
    //                 ${encounter.guildMembers.map(guildMember => `<@${guildMember.id}>: ${getDamageTaken(guildMember.id)}`).join('\n')}
    //             `,
    //             footer: {
    //                 text: `Encounter ID: ${encounter.id}`
    //             },
    //             color: deadCreatures.length === encounter.creatures.length ? Colors.Green : Colors.Red,
    //         });

    //         // Log the end of the encounter
    //         if (deadCreatures.length === encounter.creatures.length) {
    //             this.logger.info(`Encounter ${encounter.id} has ended. The creatures have been defeated.`);
    //             this.logger.info(`XP awarded: ${xpPerGuildMember} per guild member.`);
    //             this.logger.info(`Loot awarded: ${lootTable.map(lootTable => lootTable.name).join(', ')}`);

    //             // Add the fields to the embed
    //             embed.addFields([{
    //                 name: 'XP Awarded',
    //                 value: `${xpPerGuildMember} per guild member.`,
    //             }, {
    //                 name: 'Loot Awarded',
    //                 value: lootTable.map(lootTable => lootTable.name).join(', '),
    //             }]);
    //         } else {
    //             this.logger.info(`Encounter ${encounter.id} has ended. The guild members have been defeated.`);
    //         }

    //         // Respond with the end of the encounter
    //         await interaction.editReply({
    //             embeds: [embed],
    //             components: []
    //         });

    //         return true;
    //     }

    //     return false;
    // }

    // async handleBattleLoop(interaction: ButtonInteraction | StringSelectMenuInteraction, encounterId: string) {
    //     // For each initative, go through the list and have them take their turn
    //     // If they are a creature, they will attack a random member of the party
    //     // If they are a guild member, we need to show them a list of actions they can take
    //     // If they are a guild member, they can attack, use an item, or run
    //     // If they attack, they will attack the creature they select (or a random one if they don't select one)
    //     // If they use an item, they will use the item they select
    //     // If they run, they will run away from the encounter

    //     const initialEncounter = await prisma.encounter.findUnique({
    //         where: {
    //             id: encounterId,
    //         },
    //         include: {
    //             creatures: {
    //                 include: {
    //                     template: true,
    //                 },
    //             },
    //             guildMembers: true,
    //             initiatives: true,
    //         }
    //     });

    //     // TODO: Handle this
    //     if (!initialEncounter) return;
    //     if (initialEncounter?.initiatives.length === 0) return;

    //     // Check if the encounter is over
    //     if (await this.checkForTheDead(initialEncounter.id, interaction)) return;

    //     // Remove the turns that have already happened
    //     const initiatives = initialEncounter.initiatives.slice(initialEncounter.turn);

    //     if (initialEncounter.turn === 0) this.logger.info(`Starting battle loop for encounter ${initialEncounter.id} with ${initialEncounter.initiatives.length} initiatives`);
    //     else this.logger.info(`Resuming battle loop for encounter ${initialEncounter.id} with ${initialEncounter.initiatives.length} initiatives, starting at turn ${initialEncounter.turn}`);

    //     // Loop through each initative
    //     for (const initiative of initiatives) {
    //         // Increment the turn
    //         const encounter = await prisma.encounter.update({
    //             where: {
    //                 id: initialEncounter.id,
    //             },
    //             data: {
    //                 turn: {
    //                     increment: 1,
    //                 },
    //             },
    //             include: {
    //                 creatures: true,
    //                 guildMembers: true,
    //                 initiatives: true,
    //             },
    //         });

    //         this.logger.info(`Starting turn ${encounter.turn} for encounter ${encounter.id} with ${encounter.initiatives.length} initiatives`);

    //         // Check if the encounter is over
    //         if (await this.checkForTheDead(encounter.id, interaction)) break;

    //         if (initiative.entityType === EntityType.CREATURE) {
    //             // Get the creature
    //             // TODO: Ensure creature exists
    //             // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    //             const creature = encounter.creatures.find(creature => creature.id === initiative.entityId)!;

    //             // If the creature is dead, skip their turn
    //             if (creature.health <= 0) {
    //                 this.logger.info(`Creature ${creature.id} is dead, skipping their turn`);
    //                 continue;
    //             } else {
    //                 this.logger.info(`Creature ${creature.id} is alive, taking their turn`);
    //             }

    //             // Get a random guild member
    //             const guildMember = encounter.guildMembers[Math.floor(Math.random() * encounter.guildMembers.length)];

    //             // Get the damage done
    //             const damage = creature.attack >= guildMember.health ? guildMember.health : creature.attack;

    //             // Attack the guild member
    //             await prisma.guildMember.update({
    //                 where: {
    //                     id: guildMember.id,
    //                 },
    //                 data: {
    //                     health: {
    //                         decrement: damage,
    //                     },
    //                 },
    //             });

    //             // Save the attack event
    //             await prisma.encounter.update({
    //                 where: {
    //                     id: encounter.id,
    //                 },
    //                 data: {
    //                     attacks: {
    //                         create: {
    //                             attackerId: creature.id,
    //                             attackerType: EntityType.CREATURE,
    //                             defenderId: guildMember.id,
    //                             defenderType: EntityType.GUILD_MEMBER,
    //                             damage,
    //                         },
    //                     },
    //                 },
    //             });

    //             // Show the attack
    //             await interaction.editReply({
    //                 embeds: [{
    //                     title: `Encounter [${encounter.turn}/${encounter.initiatives.length}]`,
    //                     description: outdent`
    //                         ${creature.name} attacks <@${guildMember.id}> for ${damage} damage.
    //                     `,
    //                     color: Colors.Red,
    //                 }],
    //                 components: [],
    //             });

    //             // Wait 2s before continuing
    //             await sleep(2_000);
    //         } else if (initiative.entityType === EntityType.GUILD_MEMBER) {
    //             // Get the guild member
    //             // TODO: #2:6h/dev Ensure guild member exists
    //             // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    //             const guildMember = encounter.guildMembers.find(guildMember => guildMember.id === initiative.entityId)!;

    //             // If the guild member is dead, skip their turn
    //             if (guildMember.health <= 0) {
    //                 this.logger.info(`Guild member ${guildMember.id} is dead, skipping their turn`);
    //                 continue;
    //             } else {
    //                 this.logger.info(`Guild member ${guildMember.id} is alive, taking their turn`);
    //             }

    //             // Get the next initative
    //             // const nextInitiative = encounter.initiatives[encounter.turn + 1] ?? encounter.initiatives[0];

    //             // Show them a list of actions they can take
    //             await interaction.editReply({
    //                 embeds: [{
    //                     title: `Encounter [${encounter.turn}/${encounter.initiatives.length}]`,
    //                     fields: [{
    //                         name: 'Current turn',
    //                         value: `<@${guildMember.id}>`,
    //                         inline: true,
    //                         // }, {
    //                         //     name: 'Next turn',
    //                         //     value: nextInitiative.entityType === EntityType.CREATURE
    //                         //         ? encounter.creatures.find(creature => creature.id === nextInitiative.entityId)!.name :
    //                         //         `<@${encounter.guildMembers.find(guildMember => guildMember.id === nextInitiative.entityId)!.id}>`,
    //                         //     inline: true,
    //                     }, {
    //                         name: 'Party',
    //                         value: encounter.guildMembers.map(guildMember => `<@${guildMember.id}>: ${guildMember.health}`).join('\n'),
    //                     }, {
    //                         name: 'Creatures',
    //                         value: encounter.creatures.map(creature => `${creature.name}: ${creature.health}`).join('\n'),
    //                     }],
    //                     footer: {
    //                         text: `Encounter ID: ${encounter.id}`
    //                     }
    //                 }],
    //                 components: [
    //                     new ActionRowBuilder<ButtonBuilder>()
    //                         .addComponents([
    //                             new ButtonBuilder()
    //                                 .setCustomId('encounter-button-melee-attack')
    //                                 .setLabel('Punch')
    //                                 .setStyle(ButtonStyle.Primary),
    //                             new ButtonBuilder()
    //                                 .setCustomId('encounter-button-ranged-attack')
    //                                 .setLabel('Throw a rock')
    //                                 .setStyle(ButtonStyle.Primary),
    //                         ]),
    //                     new ActionRowBuilder<ButtonBuilder>()
    //                         .addComponents([
    //                             new ButtonBuilder()
    //                                 .setCustomId('encounter-run')
    //                                 .setLabel('Run')
    //                                 .setEmoji('🏃')
    //                                 .setStyle(ButtonStyle.Secondary),
    //                             new ButtonBuilder()
    //                                 .setCustomId('encounter-inventory')
    //                                 .setLabel('Inventory')
    //                                 .setEmoji('🎒')
    //                                 .setStyle(ButtonStyle.Secondary)
    //                         ])
    //                 ]
    //             });

    //             // Exit the loop
    //             return;
    //         }
    //     }

    //     // Refetch the encounter
    //     const encounter = await prisma.encounter.findUnique({
    //         where: {
    //             id: encounterId,
    //         },
    //         include: {
    //             creatures: true,
    //             guildMembers: true,
    //             initiatives: true,
    //         }
    //     });
    //     if (!encounter) return;

    //     // If there are no more initiatives, reset the turn
    //     if (encounter.initiatives.length === encounter.turn) {
    //         await prisma.encounter.update({
    //             where: {
    //                 id: encounter.id
    //             },
    //             data: {
    //                 turn: 0
    //             }
    //         });

    //         // Start the loop again
    //         await this.handleBattleLoop(interaction, encounterId);
    //     }
    // }

    // @ButtonComponent({
    //     id: 'encounter-battle-start',
    // })
    // async battleStart(
    //     interaction: ButtonInteraction,
    // ) {
    //     if (!interaction.guild?.id) return;
    //     if (!interaction.member?.user.id) return;

    //     // Show the bot is thinking
    //     if (!interaction.deferred) await interaction.deferUpdate();

    //     // Get the encounter
    //     const encounter = await prisma.encounter.findFirst({
    //         where: {
    //             guildMembers: {
    //                 some: {
    //                     id: interaction.member?.user.id
    //                 }
    //             }
    //         },
    //         include: {
    //             creatures: true,
    //             guild: true,
    //             guildMembers: true
    //         }
    //     });
    //     if (!encounter) return;

    //     // Get the user's details
    //     const user = await prisma.guildMember.findUnique({ where: { id: interaction.member?.user.id } });
    //     if (!user) return;

    //     // Roll initative for everyone
    //     const guildMembersInitative = encounter.guildMembers.map(member => ({
    //         entityType: EntityType.GUILD_MEMBER,
    //         entityId: member.id,
    //         roll: Math.floor(Math.random() * 20) + 1
    //     }));

    //     const creaturesInitiative = encounter.creatures.map(creature => ({
    //         entityType: EntityType.CREATURE,
    //         entityId: creature.id,
    //         roll: Math.floor(Math.random() * 20) + 1,
    //     }));

    //     // Sort the initiative
    //     const initiatives = [...guildMembersInitative, ...creaturesInitiative].sort((a, b) => b.roll - a.roll).map((initiative, index) => ({
    //         ...initiative,
    //         order: index
    //     }));

    //     // Update the encounter
    //     await prisma.encounter.update({
    //         where: {
    //             id: encounter.id
    //         },
    //         data: {
    //             initiatives: {
    //                 createMany: {
    //                     data: initiatives
    //                 }
    //             }
    //         }
    //     });

    //     this.logger.info(`Started encounter ${encounter.id} in guild ${encounter.guild.id} with ${encounter.guildMembers.length} guild members and ${encounter.creatures.length} creatures.`);

    //     // Start the battle loop
    //     await this.handleBattleLoop(interaction, encounter.id);
    // }

    // @ButtonComponent({
    //     id: 'encounter-button-melee-attack',
    // })
    // async buttonMeleeAttack(
    //     interaction: ButtonInteraction,
    // ) {
    //     if (!interaction.guild?.id) return;
    //     if (!interaction.member?.user.id) return;

    //     // Show the bot is thinking
    //     if (!interaction.deferred) await interaction.deferUpdate();

    //     // Get the encounter
    //     const encounter = await prisma.encounter.findFirst({
    //         where: {
    //             guildMembers: {
    //                 some: {
    //                     id: interaction.member?.user.id,
    //                 },
    //             },
    //         },
    //         include: {
    //             creatures: {
    //                 where: {
    //                     health: {
    //                         gt: 0,
    //                     },
    //                 },
    //                 include: {
    //                     template: true,
    //                 },
    //             },
    //             initiatives: true,
    //         },
    //     });
    //     if (!encounter) return;

    //     // Check if it's the user's turn
    //     if (!await this.isUserTurn(interaction, encounter.id)) return;

    //     // Show the user a list of creatures
    //     const creatures = encounter.creatures.map(creature => ({
    //         label: `${creature.name} (${creature.health}/${creature.template.health} HP) - ATK: ${creature.template.attack} DEF: ${creature.template.defence}`,
    //         value: creature.id
    //     }));

    //     // Show them a list of actions they can take
    //     await interaction.editReply({
    //         embeds: [{
    //             title: `Encounter [${encounter.turn}/${encounter.initiatives.length}]`,
    //             fields: [{
    //                 name: 'Turn',
    //                 value: `<@${interaction.member?.user.id}>`,
    //             }],
    //             footer: {
    //                 text: `Encounter ID: ${encounter.id}`
    //             }
    //         }],
    //         components: [
    //             new ActionRowBuilder<StringSelectMenuBuilder>()
    //                 .addComponents([
    //                     new StringSelectMenuBuilder()
    //                         .setCustomId('encounter-select-melee-attack')
    //                         .setPlaceholder('Select a creature')
    //                         .addOptions(creatures)
    //                 ])
    //         ]
    //     });
    // }

    // @SelectMenuComponent({
    //     id: 'encounter-select-melee-attack',
    // })
    // async selectMeleeAttack(
    //     interaction: StringSelectMenuInteraction,
    // ) {
    //     if (!interaction.guild?.id) return;
    //     if (!interaction.member?.user.id) return;

    //     // Show the bot is thinking
    //     if (!interaction.deferred) await interaction.deferUpdate();

    //     this.logger.info(`${interaction.member?.user.id} is attacking ${interaction.values[0]} with a melee attack`);

    //     // Get the encounter
    //     const encounter = await prisma.encounter.findFirst({
    //         where: {
    //             guildMembers: {
    //                 some: {
    //                     id: interaction.member?.user.id
    //                 }
    //             }
    //         },
    //         include: {
    //             initiatives: true,
    //         }
    //     });
    //     if (!encounter) return;

    //     // Check if it's the user's turn
    //     if (!await this.isUserTurn(interaction, encounter.id)) return;

    //     // Get the user's weapon
    //     const weapon = await prisma.item.findFirst({
    //         where: {
    //             ownerId: interaction.member?.user.id,
    //             equipped: true,
    //             slot: Slot.MAIN_HAND,
    //             type: ItemType.WEAPON,
    //             subType: ItemSubType.FIST,
    //         },
    //     });

    //     // Get the creature
    //     const creature = await prisma.creature.findFirst({
    //         where: {
    //             id: interaction.values[0]
    //         }
    //     });

    //     // If the creature doesn't exist, return
    //     if (!creature) {
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: `Encounter [${encounter.turn}/${encounter.initiatives.length}]`,
    //                 description: 'That creature doesn\'t exist',
    //                 footer: {
    //                     text: `Encounter ID: ${encounter.id}`
    //                 }
    //             }],
    //             components: []
    //         });
    //         return;
    //     }

    //     // Attack the creature
    //     await prisma.creature.update({
    //         where: {
    //             id: interaction.values[0]
    //         },
    //         data: {
    //             health: {
    //                 decrement: weapon?.damage ?? 1
    //             }
    //         }
    //     });

    //     // Update the encounter
    //     await prisma.encounter.update({
    //         where: {
    //             id: encounter.id
    //         },
    //         data: {
    //             attacks: {
    //                 create: {
    //                     attackerId: interaction.member?.user.id,
    //                     attackerType: EntityType.GUILD_MEMBER,
    //                     defenderId: interaction.values[0],
    //                     defenderType: EntityType.CREATURE,
    //                     damage: weapon?.damage ?? 1,
    //                 }
    //             }
    //         }
    //     });

    //     // Send them a message
    //     await interaction.editReply({
    //         embeds: [{
    //             title: `Encounter [${encounter.turn}/${encounter.initiatives.length}]`,
    //             description: `You attacked ${creature.name} with a melee attack for ${weapon?.damage ?? 1} damage`,
    //             footer: {
    //                 text: `Encounter ID: ${encounter.id}`
    //             }
    //         }],
    //         components: []
    //     });

    //     // Wait 1s before continuing
    //     await sleep(1_000);

    //     // Continue the battle loop
    //     await this.isExploring(interaction);
    // }

    // @ButtonComponent({
    //     id: 'encounter-button-ranged-attack',
    // })
    // async buttonRangedAttack(
    //     interaction: ButtonInteraction,
    // ) {
    //     if (!interaction.guild?.id) return;
    //     if (!interaction.member?.user.id) return;

    //     // Show the bot is thinking
    //     if (!interaction.deferred) await interaction.deferUpdate();

    //     // Get the encounter
    //     const encounter = await prisma.encounter.findFirst({
    //         where: {
    //             guildMembers: {
    //                 some: {
    //                     id: interaction.member?.user.id,
    //                 },
    //             },
    //         },
    //         include: {
    //             creatures: {
    //                 where: {
    //                     health: {
    //                         gt: 0,
    //                     },
    //                 },
    //                 include: {
    //                     template: true,
    //                 },
    //             },
    //             initiatives: true,
    //         },
    //     });
    //     if (!encounter) return;

    //     // Check if it's the user's turn
    //     if (!await this.isUserTurn(interaction, encounter.id)) return;

    //     // Show the user a list of creatures
    //     const creatures = encounter.creatures.map(creature => ({
    //         label: `${creature.name} (${creature.health}/${creature.template.health} HP) - ATK: ${creature.template.attack} DEF: ${creature.template.defence}`,
    //         value: creature.id
    //     }));

    //     // Show them a list of actions they can take
    //     await interaction.editReply({
    //         embeds: [{
    //             title: `Encounter [${encounter.turn}/${encounter.initiatives.length}]`,
    //             fields: [{
    //                 name: 'Turn',
    //                 value: `<@${interaction.member?.user.id}>`,
    //             }],
    //             footer: {
    //                 text: `Encounter ID: ${encounter.id}`
    //             }
    //         }],
    //         components: [
    //             new ActionRowBuilder<StringSelectMenuBuilder>()
    //                 .addComponents([
    //                     new StringSelectMenuBuilder()
    //                         .setCustomId('encounter-select-ranged-attack')
    //                         .setPlaceholder('Select a creature')
    //                         .addOptions(creatures)
    //                 ])
    //         ]
    //     });
    // }

    // @SelectMenuComponent({
    //     id: 'encounter-select-ranged-attack',
    // })
    // async selectRangedAttack(
    //     interaction: StringSelectMenuInteraction,
    // ) {
    //     if (!interaction.guild?.id) return;
    //     if (!interaction.member?.user.id) return;

    //     // Show the bot is thinking
    //     if (!interaction.deferred) await interaction.deferUpdate();

    //     this.logger.info(`${interaction.member?.user.id} is attacking ${interaction.values[0]} with a ranged attack`);

    //     // Get the encounter
    //     const encounter = await prisma.encounter.findFirst({
    //         where: {
    //             guildMembers: {
    //                 some: {
    //                     id: interaction.member?.user.id
    //                 }
    //             }
    //         },
    //         include: {
    //             initiatives: true,
    //         }
    //     });
    //     if (!encounter) return;

    //     // Check if it's the user's turn
    //     if (!await this.isUserTurn(interaction, encounter.id)) return;

    //     // Get the user's ranged weapon
    //     const weapon = await prisma.item.findFirst({
    //         where: {
    //             ownerId: interaction.member?.user.id,
    //             equipped: true,
    //             slot: Slot.MAIN_HAND,
    //             type: ItemType.WEAPON,
    //             subType: {
    //                 in: [ItemSubType.BOW, ItemSubType.CROSSBOW]
    //             }
    //         },
    //     });

    //     // Get the creature
    //     const creature = await prisma.creature.findFirst({
    //         where: {
    //             id: interaction.values[0]
    //         }
    //     });

    //     // If the creature doesn't exist, return
    //     if (!creature) {
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: `Encounter [${encounter.turn}/${encounter.initiatives.length}]`,
    //                 description: 'That creature doesn\'t exist',
    //                 footer: {
    //                     text: `Encounter ID: ${encounter.id}`
    //                 }
    //             }],
    //             components: []
    //         });
    //         return;
    //     }

    //     // Attack the creature
    //     await prisma.creature.update({
    //         where: {
    //             id: interaction.values[0]
    //         },
    //         data: {
    //             health: {
    //                 decrement: weapon?.damage ?? 1
    //             }
    //         }
    //     });

    //     // Update the encounter
    //     await prisma.encounter.update({
    //         where: {
    //             id: encounter.id
    //         },
    //         data: {
    //             attacks: {
    //                 create: {
    //                     attackerId: interaction.member?.user.id,
    //                     attackerType: EntityType.GUILD_MEMBER,
    //                     defenderId: interaction.values[0],
    //                     defenderType: EntityType.CREATURE,
    //                     damage: weapon?.damage ?? 1,
    //                 }
    //             }
    //         }
    //     });

    //     // Start the battle loop
    //     await this.handleBattleLoop(interaction, encounter.id);
    // }

    // @ButtonComponent({
    //     id: 'encounter-run',
    // })
    // async run(
    //     interaction: ButtonInteraction
    // ) {
    //     if (!interaction.guild?.id) return;
    //     if (!interaction.member?.user.id) return;

    //     // Show the bot is thinking
    //     if (!interaction.deferred) await interaction.deferUpdate();

    //     // Get the encounter
    //     const encounter = await prisma.encounter.findFirst({
    //         where: {
    //             guildMembers: {
    //                 some: {
    //                     id: interaction.member?.user.id,
    //                 },
    //             },
    //         },
    //         include: {
    //             creatures: true,
    //             guild: true,
    //             guildMembers: true,
    //             initiatives: true,
    //         },
    //     });

    //     // If there is no encounter
    //     if (!encounter) {
    //         // Respond with the result
    //         await interaction.reply({
    //             ephemeral: true,
    //             embeds: [{
    //                 title: 'Encounter',
    //                 description: 'You aren\'t in this encounter.',
    //             }],
    //             components: []
    //         });
    //         return;
    //     }

    //     // // Check if the battle has started
    //     // if (encounter.turn !== 0) {
    //     //     // Check if it's the user's turn
    //     //     if (!await this.isUserTurn(interaction, encounter.id)) {
    //     //         // Respond with the result
    //     //         await interaction.reply({
    //     //             ephemeral: true,
    //     //             embeds: [{
    //     //                 title: `Encounter [${encounter.turn}/${encounter.initiatives.length}]`,
    //     //                 description: 'It\'s not your turn.',
    //     //             }],
    //     //             components: []
    //     //         });
    //     //         return;
    //     //     }
    //     // }

    //     // Update the encounter
    //     await prisma.encounter.update({
    //         where: {
    //             id: encounter.id,
    //         },
    //         data: {
    //             end: new Date(),
    //             guildMembers: {
    //                 disconnect: {
    //                     id: interaction.member?.user.id,
    //                 },
    //             },
    //             previousGuildMembers: {
    //                 connect: {
    //                     id: interaction.member?.user.id,
    //                 },
    //             },
    //         },
    //     });

    //     // Respond with the result
    //     await interaction.editReply({
    //         embeds: [{
    //             title: `Encounter [${encounter.turn}/${encounter.initiatives.length}]`,
    //             description: 'You run away from the encounter.',
    //             footer: {
    //                 text: `Encounter ID: ${encounter.id}`
    //             }
    //         }],
    //         components: []
    //     });
    // }

    // async showInventory(interaction: ButtonInteraction | CommandInteraction, title: string, customId: string) {
    //     if (!interaction.guild?.id) return;

    //     // Get the interaction user's ID and username
    //     const userId = interaction.member?.user.id;
    //     const userUsername = interaction.member?.user.username;
    //     if (!userId || !userUsername) return;

    //     // Get the user's inventory
    //     const user = await prisma.guildMember.findUnique({
    //         where: {
    //             id: userId,
    //         },
    //         include: {
    //             inventory: true,
    //         },
    //     });
    //     if (!user) return;

    //     this.logger.info(`Showing inventory for ${userId} (${userUsername})`);

    //     const components = [
    //         ...(user.inventory.length >= 1 ? [
    //             new ActionRowBuilder<ButtonBuilder>()
    //                 .addComponents(
    //                     user.inventory.slice(0, 5).map(item => {
    //                         const itemCustomId = `${customId}-item-use [${item.id}]`;
    //                         this.logger.info(`Adding item ${itemCustomId} to ActionRowBuilder for ${userId} (${userUsername})`);
    //                         return new ButtonBuilder()
    //                             .setCustomId(itemCustomId)
    //                             .setLabel(item.name)
    //                             .setEmoji(item.emoji)
    //                             .setStyle(ButtonStyle.Primary);
    //                     })
    //                 )
    //         ] : []),
    //         new ActionRowBuilder<ButtonBuilder>()
    //             .addComponents(
    //                 new ButtonBuilder()
    //                     .setCustomId(`${customId}-close`)
    //                     .setLabel('Close')
    //                     .setStyle(ButtonStyle.Danger)
    //             ),
    //     ];

    //     // Respond with the result
    //     await interaction.editReply({
    //         embeds: [{
    //             title,
    //             description: 'You open your inventory.'
    //         }],
    //         components,
    //     });
    // }

    // @ButtonComponent({
    //     id: /^encounter-inventory-item-use \[([0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12})\]$/
    // })
    // async encounterInventoryItemUse(
    //     interaction: ButtonInteraction
    // ) {
    //     if (!interaction.guild?.id) return;

    //     // Get the interaction user's ID and username
    //     const userId = interaction.member?.user.id;
    //     const userUsername = interaction.member?.user.username;
    //     if (!userId || !userUsername) return;

    //     this.logger.info(`Using item in encounter for ${userId} (${userUsername})`);

    //     // Show the bot is thinking
    //     if (!interaction.deferred) await interaction.deferUpdate();

    //     // Get the encounter
    //     const encounter = await prisma.encounter.findFirst({
    //         where: {
    //             guildMembers: {
    //                 some: {
    //                     id: interaction.member?.user.id,
    //                 },
    //             },
    //         },
    //         include: {
    //             initiatives: true,
    //         }
    //     });

    //     // If there is no encounter
    //     if (!encounter) {
    //         // Respond with the result
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Encounter',
    //                 description: 'You are not in an encounter.'
    //             }],
    //             components: []
    //         });
    //         return;
    //     }

    //     // Get the item
    //     const itemId = interaction.customId.match(/^encounter-inventory-item-use \[([0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12})\]$/)?.[1];
    //     if (!itemId) return;
    //     const item = await prisma.item.findFirst({
    //         where: {
    //             id: itemId,
    //             ownerId: interaction.member?.user.id,
    //         },
    //     });
    //     if (!item) {
    //         // Respond with the result
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Encounter',
    //                 description: 'You don\'t have that item.'
    //             }],
    //             components: []
    //         });
    //         return;
    //     }

    //     this.logger.info(`Using item ${item.id} (${item.name}) [${item.type}:${item.subType}] in encounter ${encounter.id} for ${userId} (${userUsername})`);

    //     // Check if the item is a weapon
    //     if (item.type === ItemType.WEAPON) {
    //         // Check if the item is already equipped
    //         if (item.equipped) {
    //             this.logger.info(`Item ${item.id} (${item.name}) is already equipped for ${userId} (${userUsername})`);

    //             // Respond with the result
    //             await interaction.editReply({
    //                 embeds: [{
    //                     title: 'Encounter',
    //                     description: `You already have the ${item.name} equipped.`
    //                 }],
    //                 components: []
    //             });

    //             // Wait 1s for the message to show
    //             await sleep(1_000);

    //             // Get the encounter
    //             await this.isExploring(interaction);

    //             return;
    //         }

    //         // Get the current weapon
    //         const currentWeapon = await prisma.item.findFirst({
    //             where: {
    //                 ownerId: interaction.member?.user.id,
    //                 equipped: true,
    //                 slot: Slot.MAIN_HAND,
    //             },
    //         });

    //         // Equip the weapon
    //         await prisma.$transaction(async prisma => {
    //             // Unequip the current weapon
    //             if (currentWeapon) {
    //                 this.logger.info(`Unequipping weapon ${currentWeapon.id} (${currentWeapon.name}) in encounter ${encounter.id} for ${userId} (${userUsername})`);
    //                 await prisma.item.update({
    //                     where: {
    //                         id: currentWeapon?.id,
    //                     },
    //                     data: {
    //                         equipped: false,
    //                     },
    //                 });
    //             }

    //             // Equip the new weapon
    //             this.logger.info(`Equipping weapon ${item.id} (${item.name}) in encounter ${encounter.id} for ${userId} (${userUsername})`);
    //             await prisma.item.update({
    //                 where: {
    //                     id: item.id,
    //                 },
    //                 data: {
    //                     equipped: true,
    //                 },
    //             });
    //         });

    //         // Respond with the result
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Encounter',
    //                 description: currentWeapon ? `You unequip the ${currentWeapon.name} and equip the ${item.name}.` : `You equip the ${item.name}.`
    //             }],
    //             components: []
    //         });
    //     }

    //     // Wait 1s for the message to show
    //     await sleep(1_000);

    //     // Get the encounter
    //     await this.isExploring(interaction);
    // }

    // @ButtonComponent({
    //     id: 'encounter-inventory',
    // })
    // async encounterInventory(
    //     interaction: ButtonInteraction
    // ) {
    //     if (!interaction.guild?.id) return;
    //     if (!interaction.member?.user.id) return;

    //     // Show the bot is thinking
    //     if (!interaction.deferred) await interaction.deferUpdate();

    //     // Get the encounter
    //     const encounter = await prisma.encounter.findFirst({
    //         where: {
    //             guildMembers: {
    //                 some: {
    //                     id: interaction.member?.user.id,
    //                 },
    //             },
    //         },
    //         include: {
    //             initiatives: true,
    //         }
    //     });

    //     // If there is no encounter
    //     if (!encounter) {
    //         // Respond with the result
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Encounter',
    //                 description: 'You are not in an encounter.'
    //             }],
    //             components: []
    //         });
    //         return;
    //     }

    //     // Show the inventory
    //     await this.showInventory(interaction, `Encounter [${encounter.turn}/${encounter.initiatives.length}]`, 'encounter-inventory');
    // }

    // @ButtonComponent({
    //     id: 'encounter-inventory-close',
    // })
    // async closeEncounterInventory(
    //     interaction: ButtonInteraction
    // ) {
    //     if (!interaction.guild?.id) return;

    //     // Show the bot is thinking
    //     if (!interaction.deferred) await interaction.deferUpdate();

    //     // Get the encounter
    //     if (await this.isExploring(interaction)) return;

    //     // Respond with the result
    //     await interaction.followUp({
    //         ephemeral: true,
    //         embeds: [{
    //             title: 'Encounter',
    //             description: 'You\'re not in an encounter.'
    //         }],
    //         components: []
    //     });
    // }

    // @ButtonComponent({
    //     id: 'inventory-close',
    // })
    // async closeInventory(
    //     interaction: ButtonInteraction
    // ) {
    //     if (!interaction.guild?.id) return;

    //     // Show the bot is thinking
    //     if (!interaction.deferred) await interaction.deferUpdate();

    //     // Respond with the result
    //     await interaction.editReply({
    //         embeds: [{
    //             title: 'Inventory',
    //             description: 'You close your inventory.'
    //         }],
    //         components: [],
    //     });
    // }

    // @Slash({
    //     name: 'travel',
    //     description: 'Travel to a new location',
    // })
    // async travel(
    //     @SlashOption({
    //         name: 'location',
    //         description: 'The location to travel to',
    //         required: true,
    //         type: ApplicationCommandOptionType.String,
    //         autocomplete: locationAutoComplete
    //     })
    //     locationName: string,
    //     interaction: CommandInteraction
    // ) {
    //     // Show the bot thinking
    //     await interaction.deferReply({ ephemeral: false });

    //     // Get the user
    //     const user = await db
    //         .selectFrom('guild_members')
    //         .select('encounterId')
    //         .select('location')
    //         .where('id', '=', interaction.user.id)
    //         .executeTakeFirst();

    //     if (!user) return;

    //     // Don't allow travelling if the user's in an encounter
    //     if (user.encounterId) {
    //         // Respond with the result
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Travel',
    //                 description: 'You can\'t travel while in an encounter.',
    //                 color: Colors.Red,
    //             }],
    //         });
    //         return;
    //     }

    //     // Check if a location exists with that name
    //     if (!Locations.includes(locationName)) {
    //         // Respond with the result
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Travel',
    //                 description: 'That location doesn\'t exist.',
    //             }],
    //         });
    //         return;
    //     }

    //     // Check if the user is already in the location
    //     if (user.location === locationName) {
    //         // Respond with the result
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Travel',
    //                 description: 'You are already in that location.',
    //                 color: Colors.Red,
    //             }],
    //         });
    //         return;
    //     }

    //     // Update the user's location
    //     await db
    //         .updateTable('guild_members')
    //         .set({
    //             location: locationName,
    //         })
    //         .where('id', '=', interaction.user.id)
    //         .execute();

    //     // Respond with the result
    //     await interaction.editReply({
    //         embeds: [{
    //             title: 'Travel',
    //             description: `You travel to ${locationName}.`,
    //             color: Colors.Blue,
    //         }],
    //     });
    // }

    // @Slash({
    //     name: 'creature',
    //     description: 'Check a creature\'s details',
    // })
    // async creature(
    //     @SlashOption({
    //         name: 'name',
    //         description: 'The name of the creature',
    //         required: false,
    //         type: ApplicationCommandOptionType.String,
    //         async autocomplete(interaction) {
    //             const name = interaction.options.getString('name');
    //             const creatures = await db
    //                 .selectFrom('creature_templates')
    //                 .select('id')
    //                 .select('name')
    //                 .where('name', 'like', name)
    //                 .execute();

    //             await interaction.respond(creatures.map(creature => {
    //                 return {
    //                     name: creature.name,
    //                     value: creature.id,
    //                 };
    //             }));
    //         },
    //     })
    //     creatureId: string | undefined,
    //     @SlashOption({
    //         name: 'location',
    //         description: 'The location creatures are in',
    //         required: false,
    //         type: ApplicationCommandOptionType.String,
    //         autocomplete: locationAutoComplete
    //     })
    //     location: Location | undefined,
    //     interaction: CommandInteraction
    // ) {
    //     // Show the bot thinking
    //     await interaction.deferReply({ ephemeral: false });

    //     // If they didn't pick a creature and didn't pick a location
    //     if (!creatureId && !location) {
    //         // Respond with the result
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Creature',
    //                 description: 'You must pick a creature or a location.',
    //                 color: Colors.Red,
    //             }]
    //         });
    //         return;
    //     }

    //     // Get the creature template(s)
    //     const creatures = await db
    //         .selectFrom('creature_templates')
    //         .select('imageUrl')
    //         .select('name')
    //         .select('emoji')
    //         .select('description')
    //         .select('location')
    //         .select('rarity')
    //         .select('attack')
    //         .select('defence')
    //         .select('health')
    //         .$if(creatureId !== undefined, qb => qb.where('id', '=', creatureId as string))
    //         .$if(location !== undefined, qb => qb.where('location', '=', location as Location))
    //         .limit(5)
    //         .execute();

    //     // If they picked a creature and it doesn't exist
    //     if (creatureId && creatures.length === 0) {
    //         // Respond with the result
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Creature',
    //                 description: 'That creature doesn\'t exist.',
    //                 color: Colors.Red,
    //             }],
    //         });
    //         return;
    //     }

    //     // If they didn't pick a creature and there are no creatures in the location
    //     if (!creatureId && creatures.length === 0) {
    //         // Respond with the result
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Creature',
    //                 description: 'There are no creatures in that location.',
    //                 color: Colors.Red,
    //             }],
    //         });
    //         return;
    //     }

    //     // Files to attach
    //     const files: AttachmentBuilder[] = [];

    //     // attachment://assets/creatures/greg/profile.png -> assets/creatures/greg/profile.png
    //     const resolveImageUrl = (url: string) => {
    //         if (!url.startsWith('attachment://')) return url;
    //         return url.replace('attachment://', '');
    //     };

    //     // attachment://assets/creatures/greg/profile.png -> assets_creatures_greg_profile.png
    //     const resolveImageName = (url: string) => {
    //         if (!url.startsWith('attachment://')) return url;
    //         const filePath = url.replace('attachment://', '');
    //         const fileName = filePath.replace(/\//g, '_');
    //         return fileName;
    //     };

    //     // assets/creatures/${dirent.name}/profile.png
    //     // If the image is a local file attach it
    //     for (const creature of creatures) {
    //         if (creature.imageUrl?.startsWith('attachment://')) {
    //             const filePath = resolveImageUrl(creature.imageUrl);
    //             const fileName = resolveImageName(creature.imageUrl);
    //             const file = new AttachmentBuilder(filePath, {
    //                 name: fileName,
    //                 description: `Image for ${creature.name}`,
    //             });
    //             this.logger.info(`Attaching ${creature.imageUrl} as ${fileName} from ${filePath}`);
    //             files.push(file);
    //         }
    //     }

    //     // Respond with the result
    //     await interaction.editReply({
    //         files,
    //         embeds: creatures.map(creature => {
    //             const thumbnailUrl = creature.imageUrl ? `attachment://${resolveImageName(creature.imageUrl)}` : 'https://cdn.discordapp.com/embed/avatars/0.png';
    //             this.logger.info(`Adding thumbnail for ${creature.name} from ${thumbnailUrl} (original: ${String(creature.imageUrl)})`);
    //             this.logger.info(`Thumbnail URL: ${thumbnailUrl}`);
    //             return {
    //                 title: `${creature.emoji} ${creature.name}`,
    //                 description: creature.description,
    //                 thumbnail: {
    //                     url: thumbnailUrl,
    //                 },
    //                 fields: [{
    //                     name: 'NAME',
    //                     value: creature.name,
    //                     inline: true,
    //                 }, {
    //                     name: 'LOCATION',
    //                     value: creature.location,
    //                     inline: true,
    //                 }, {
    //                     name: 'RARITY',
    //                     value: creature.rarity,
    //                     inline: true,
    //                 }, {
    //                     name: 'HEALTH',
    //                     value: String(creature.health),
    //                     inline: true,
    //                 }, {
    //                     name: 'ATTACK',
    //                     value: String(creature.attack),
    //                     inline: true,
    //                 }, {
    //                     name: 'DEFENCE',
    //                     value: String(creature.defence),
    //                     inline: true,
    //                 }],
    //             };
    //         })
    //     });
    // }

    // @Slash({
    //     name: 'daily',
    //     description: 'Get your daily coins',
    // })
    // async daily(
    //     interaction: CommandInteraction
    // ) {
    //     const guildId = interaction.guild?.id;
    //     if (!guildId) return;

    //     // Show the bot thinking
    //     await interaction.deferReply({ ephemeral: false });

    //     // Check if the user has already claimed their daily
    //     const daily = await db
    //         .selectFrom('rate_limits')
    //         .select('lastReset')
    //         .where('id', '=', 'economy:daily')
    //         .where('memberId', '=', interaction.user.id)
    //         .executeTakeFirst();

    //     // Only allow them to claim their daily once per 24 hours
    //     if (daily && daily.lastReset.getTime() > (Date.now() - 86_400_000)) {
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Daily',
    //                 description: 'You have already claimed your daily coins today.'
    //             }]
    //         });
    //         return;
    //     }

    //     // Mark the daily as claimed for this user in this guild
    //     await db
    //         .insertInto('rate_limits')
    //         .values({
    //             id: 'economy:daily',
    //             count: 0,
    //             lastReset: new Date(),
    //             memberId: interaction.user.id,
    //             guildId,
    //         })
    //         .execute();

    //     // Give them their daily coins
    //     const balance = await db
    //         .transaction()
    //         .execute(async trx => {
    //             // Give the coins to the user
    //             await trx
    //                 .insertInto('guild_members')
    //                 .values({
    //                     id: interaction.user.id,
    //                     guildId,
    //                     coins: 100,
    //                 })
    //                 .onDuplicateKeyUpdate(eb => ({
    //                     coins: eb.bxp('coins', '+', 100)
    //                 }))
    //                 .execute();

    //             // Return the new coin count
    //             const user = await trx
    //                 .selectFrom('guild_members')
    //                 .select('coins')
    //                 .where('id', '=', interaction.user.id)
    //                 .executeTakeFirst();

    //             return user?.coins ?? 0;
    //         });

    //     // Send the balance
    //     await interaction.editReply({
    //         embeds: [{
    //             title: 'Daily',
    //             description: `You get your daily coins and get \`${100}\` coins. You now have \`${balance}\` coins.`
    //         }]
    //     });
    // }

    // @Slash({
    //     name: 'give',
    //     description: 'Give someone coins'
    // })
    // async give(
    //     @SlashOption({
    //         name: 'member',
    //         description: 'The member who you want to give coins to',
    //         type: ApplicationCommandOptionType.User,
    //         required: true
    //     }) target: GuildMember,
    //     @SlashOption({
    //         name: 'amount',
    //         description: 'How many coins you want to give them',
    //         type: ApplicationCommandOptionType.Number,
    //         required: true
    //     }) amount: number,
    //     interaction: CommandInteraction
    // ) {
    //     const userId = interaction.member?.user.id;
    //     const guildId = interaction.guild?.id;
    //     if (!userId) return;
    //     if (!guildId) return;

    //     // Show the bot thinking
    //     await interaction.deferReply({ ephemeral: false });

    //     try {
    //         // Get the user
    //         const user = await db
    //             .selectFrom('guild_members')
    //             .select('coins')
    //             .where('id', '=', userId)
    //             .executeTakeFirst();

    //         // Get the user's balance
    //         const userBalance = user?.coins ?? 0;

    //         // If the user doesn't have enough money, don't let them give
    //         if (userBalance < amount) {
    //             await interaction.editReply({
    //                 embeds: [{
    //                     title: 'Give',
    //                     description: outdent`
    //                         You can\'t give <@${target.id}> \`${amount}\` coins, as you only have \`${userBalance}\` coins. You will need \`${amount - userBalance}\` more coins.
    //                     `
    //                 }],
    //             });

    //             return;
    //         }

    //         // Transfer the coins
    //         await db.transaction().execute(async trx => {
    //             // Remove the coins from person A
    //             await trx
    //                 .updateTable('guild_members')
    //                 .set(eb => ({
    //                     coins: eb.bxp('coins', '-', amount)
    //                 }))
    //                 .execute();

    //             // Add the coins to person B
    //             await trx
    //                 .insertInto('guild_members')
    //                 .values({
    //                     id: userId,
    //                     guildId,
    //                     coins: amount,
    //                 })
    //                 .onDuplicateKeyUpdate(eb => ({
    //                     coins: eb.bxp('coins', '+', amount)
    //                 }))
    //                 .execute();
    //         });

    //         // Send the balance
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Give',
    //                 description: `You give <@${target.id}> ${amount} coins. You now have ${userBalance - amount} coins.`
    //             }]
    //         });
    //     } catch (error: unknown) {
    //         if (!(error instanceof Error)) throw new Error(`Unknown Error: ${String(error)}`);
    //         this.logger.error('Failed to transfer coins', error);
    //         await interaction.editReply({
    //             content: 'Failed to transfer coins, please let a member of staff know.'
    //         });
    //     }
    // }

    // @Slash({
    //     name: 'shop',
    //     description: 'View the shop'
    // })
    // async shop(
    //     interaction: CommandInteraction
    // ) {
    //     if (!interaction.member?.user.id) return;

    //     // Show the bot thinking
    //     if (!interaction.deferred) await interaction.deferReply({ ephemeral: false });

    //     // Get the user
    //     const user = await db
    //         .selectFrom('guild_members')
    //         .select('location')
    //         .where('id', '=', interaction.member?.user.id)
    //         .executeTakeFirst();
    //     if (!user) return;

    //     // Show a list of shops in the current location
    //     const shops = await db
    //         .selectFrom('shops')
    //         .select('id')
    //         .select('name')
    //         .select('description')
    //         .where('location', '=', user.location)
    //         .execute();

    //     // If there are no shops, tell the user
    //     if (shops.length === 0) {
    //         await interaction.editReply({
    //             embeds: [{
    //                 title: 'Shop',
    //                 description: 'There are no shops in this location.'
    //             }]
    //         });
    //         return;
    //     }

    //     // Send the shops
    //     await interaction.editReply({
    //         embeds: [{
    //             title: 'Shop',
    //             description: 'Select a shop to view the items in it.'
    //         }],
    //         components: [
    //             new ActionRowBuilder<StringSelectMenuBuilder>({
    //                 components: [
    //                     new StringSelectMenuBuilder({
    //                         customId: 'shop',
    //                         placeholder: 'Select a shop',
    //                         options: shops.map(shop => ({
    //                             label: shop.name,
    //                             value: shop.id,
    //                             description: shop.description,
    //                         })),
    //                     }),
    //                 ],
    //             }),
    //         ],
    //     });
    // }

    // @SelectMenuComponent({
    //     id: 'shop',
    // })
    // async shopSelectMenu(
    //     interaction: StringSelectMenuInteraction
    // ) {
    //     // Show the bot thinking
    //     if (!interaction.deferred) await interaction.deferUpdate();

    //     // Get the shop
    //     const shop = await db
    //         .selectFrom('shops')
    //         .select('id')
    //         .select('name')
    //         .where('id', '=', interaction.values[0])
    //         .executeTakeFirst();
    //     if (!shop) return;

    //     // Get the items
    //     const items = await db
    //         .selectFrom('item_templates')
    //         .select('name')
    //         .select('emoji')
    //         .select('description')
    //         .select('price')
    //         .where('shopId', '=', shop.id)
    //         .execute();

    //     // Send the shop
    //     await interaction.editReply({
    //         embeds: [{
    //             title: shop.name,
    //             description: items.map(item => outdent`
    //                 ${item.emoji} **${item.name}**
    //                 ${item.description}
    //                 \`${Intl.NumberFormat('en').format(item.price)}\` ${coinEmoji}
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

    // @Slash({
    //     name: 'inventory',
    //     description: 'View your inventory'
    // })
    // async inventory(
    //     interaction: CommandInteraction
    // ) {
    //     if (!interaction.guild?.id) return;

    //     // Show the bot thinking
    //     await interaction.deferReply({ ephemeral: false });

    //     // Show the inventory
    //     await this.showInventory(interaction, 'Inventory', 'inventory');
    // }
}
