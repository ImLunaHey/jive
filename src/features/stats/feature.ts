import { client } from '@app/client';
import { database } from '@app/common/database';
import { timeLength } from '@app/common/time';
import { service } from '@app/features/stats/service';
import { Logger } from '@app/logger';
import type { TextChannel } from 'discord.js';
import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, Colors } from 'discord.js';
import { type ArgsOf, Discord, On, Slash, ButtonComponent, SlashOption } from 'discordx';
import { outdent } from 'outdent';

// Time in ms
const ONE_MINUTE = 1_000 * 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;
const ONE_MONTH = (ONE_DAY * 365) / 12;

// Generate a date before the time period selected
const timePeriod = (period: 'day' | 'week' | 'month' | 'total' = 'day') => ({
    day: new Date(Date.now() - ONE_DAY),
    week: new Date(Date.now() - ONE_WEEK),
    month: new Date(Date.now() - ONE_MONTH),
    total: new Date(0),
}[period]);

@Discord()
export class Feature {
    private logger = new Logger({ service: 'Stats' });

    constructor() {
        this.logger.info('Initialised');
    }

    @On({
        event: 'ready',
    })
    async ready() {
        // Fetch all the guilds were in
        await client.guilds.fetch();

        this.logger.info('Backfilling members for guilds', {
            guildCount: client.guilds.cache.size,
        });

        // Loop through all the guilds we have
        for (const [, guild] of client.guilds.cache) {
            const guildMembers = await database
                .selectFrom('guild_members')
                .select(database.fn.count<number>('id').as('memberCount'))
                .where('guildId', '=', guild.id)
                .executeTakeFirst();

            // Fetch all the guild members for this guild
            await guild.members.fetch();

            this.logger.info('Backfilling members for guild', {
                guildId: guild.id,
                memberCount: guild.memberCount,
                membersMissing: guild.memberCount - (guildMembers?.memberCount ?? guild.memberCount),
                membersExisting: guildMembers?.memberCount ?? 0,
            });

            // For each guild member record their joined timestamp
            for (const [, member] of guild.members.cache)
                await database
                    .insertInto('guild_members')
                    .values({
                        id: member.id,
                        guildId: member.guild.id,
                        joinedTimestamp: Math.floor((member.joinedTimestamp ?? Date.now()) / 1_000),
                    })
                    .onDuplicateKeyUpdate({
                        joinedTimestamp: Math.floor((member.joinedTimestamp ?? Date.now()) / 1_000),
                    })
                    .execute();
        }
    }

    @On({
        event: 'messageCreate',
    })
    async onMessageCreate([message]: ArgsOf<'messageCreate'>) {
        if (!message.guild?.id) return;

        this.logger.debug('New message', {
            guildId: message.guild?.id,
            channelId: message.channel.id,
        });

        // Record a new message happened
        await service.newMessage(message);
    }

    @On({
        event: 'guildMemberAdd',
    })
    async onGuildMemberAdd(
        [member]: ArgsOf<'guildMemberAdd'>
    ) {
        // Record when a member joins
        await database
            .insertInto('guild_members')
            .values({
                id: member.id,
                guildId: member.guild.id,
                joinedTimestamp: Date.now() / 1_000,
            })
            .onDuplicateKeyUpdate({
                joinedTimestamp: Date.now() / 1_000,
            })
            .execute();
    }

    @On({
        event: 'guildMemberRemove',
    })
    async guildMemberRemove(
        [guildMember]: ArgsOf<'guildMemberRemove'>
    ) {
        // Get the member
        const member = await database
            .selectFrom('guild_members')
            .select('joinedTimestamp')
            .where('guildId', '=', guildMember.guild.id)
            .where('id', '=', guildMember.id)
            .executeTakeFirst();

        // If we don't have a joined timestamp bail
        if (!member || !member.joinedTimestamp) return;

        // Get a new Date object for the timestamp
        const joinedTimestamp = new Date(member.joinedTimestamp * 1_000);

        // Check how long they were here in seconds
        const diffInMilliseconds = Date.now() - joinedTimestamp.getTime();

        this.logger.info('Member left the server', {
            memberId: guildMember.id,
            guildId: guildMember.guild.id,
            joinedTimestamp: member.joinedTimestamp,
            diffInMilliseconds,
        });

        // Somehow their join timestamp was ahead of the current time?
        if (diffInMilliseconds <= 0) return;

        // Get the current fastest leave time
        const guildStats = await database
            .selectFrom('guild_stats')
            .select('fastestLeave')
            .where('guildId', '=', guildMember.guild.id)
            .executeTakeFirst();

        const newFastest = async () => {
            // Post that we have a new fastest
            const channel = client.channels.resolve('957109896313184316') as TextChannel;
            await channel.send({
                embeds: [{
                    title: 'New leave record! 🥇',
                    fields: [{
                        name: 'Name',
                        value: guildMember.displayName,
                        inline: true,
                    }, {
                        name: 'Account Created',
                        value: `<t:${Math.floor(guildMember.user.createdTimestamp / 1_000)}:R>`,
                        inline: true,
                    }, {
                        name: 'Time here',
                        value: diffInMilliseconds ? timeLength(joinedTimestamp) : 'Unknown',
                        inline: true,
                    }],
                    color: Colors.Blurple,
                }]
            });

            // Update the database
            await database
                .insertInto('guild_stats')
                .values({
                    guildId: guildMember.guild.id,
                    fastestLeave: Math.floor(diffInMilliseconds / 1_000),
                })
                .onDuplicateKeyUpdate({
                    fastestLeave: Math.floor(diffInMilliseconds / 1_000),
                })
                .execute();
        }

        // This was the first leave
        if (guildStats?.fastestLeave === undefined) return newFastest();

        // This wasn't a new record
        if (guildStats?.fastestLeave && (Math.floor(diffInMilliseconds / 1_000) >= guildStats?.fastestLeave)) return;

        // This was a new record
        return newFastest();
    }

    @Slash({
        name: 'opt-in',
        description: 'Opt into stats collection.',
    })
    async optIn(
        interaction: CommandInteraction,
    ) {
        // Only allow this in guilds
        if (!interaction.guild?.id) return;

        // Show the bot thinking
        if (!interaction.deferred) await interaction.deferReply({ ephemeral: true, });

        // Check if the user is already opted-in
        const isOptedIn = await service.isMemberOptedIn(interaction.guild?.id, interaction.user.id);

        // Tell the member they're already opted in.
        if (isOptedIn) {
            await interaction.editReply({
                embeds: [{
                    title: 'Stats collection',
                    description: outdent`
                        You're already opted in. 📊
                    `,
                }],
            });

            return;
        }

        // Mark that this user opted into stats collection
        await database
            .insertInto('guild_members')
            .values({
                id: interaction.user.id,
                guildId: interaction.guild.id,
                statsOptedIn: true,
                joinedTimestamp: Date.now() / 1_000,
            })
            .onDuplicateKeyUpdate({
                statsOptedIn: true,
            })
            .execute();

        this.logger.info('Member opted-into stats collection', {
            guildId: interaction.guild.id,
            memberId: interaction.user.id,
        });

        // Tell the user that we've enabled stats for them.
        await interaction.editReply({
            embeds: [{
                title: 'Stats collection',
                description: outdent`
                    We're now collecting stats about you. 📊

                    Thanks for opting in.
                `,
            }]
        });
    }

    @Slash({
        name: 'opt-out',
        description: 'Opt out of stats collection.',
    })
    async optOut(
        interaction: CommandInteraction,
    ) {
        // Only allow this in guilds
        if (!interaction.guild?.id) return;

        // Show the bot thinking
        if (!interaction.deferred) await interaction.deferReply({ ephemeral: true, });

        // Check if the user is already opted-in
        const isOptedIn = await service.isMemberOptedIn(interaction.guild?.id, interaction.user.id);

        // Tell the member they're not opted in
        if (!isOptedIn) {
            await interaction.editReply({
                embeds: [{
                    title: 'Stats collection',
                    description: outdent`
                        You're not opted in. 📊
                    `,
                }],
            });

            return;
        }

        // Ask the user if they're sure they want to opt-out.
        await interaction.editReply({
            embeds: [{
                title: 'Stats collection',
                description: outdent`
                    Are you sure you want to opt-out? 📊

                    This will disable stats collection from now on and delete all your existing stats.
                `,
            }],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId('opt-out-yes')
                            .setLabel('Yes')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('opt-out-no')
                            .setLabel('No')
                            .setStyle(ButtonStyle.Secondary)
                    ])
            ]
        });
    }

    @ButtonComponent({
        id: 'opt-out-no',
    })
    async optOutNo(
        interaction: ButtonInteraction,
    ) {
        // Show the bot thinking
        if (!interaction.deferred) await interaction.deferUpdate();

        // Let them know nothing happened
        await interaction.editReply({
            embeds: [{
                title: 'Stats collection',
                description: outdent`
                    You hit \`no\`. 📊
                `,
            }],
            components: [],
        });
    }

    @ButtonComponent({
        id: 'opt-out-yes',
    })
    async optOutConfirmation(
        interaction: ButtonInteraction,
    ) {
        // Only allow this in guilds
        if (!interaction.guild?.id) return;

        // Show the bot thinking
        if (!interaction.deferred) await interaction.deferUpdate();

        // Mark that this user opted out stats collection
        await database
            .insertInto('guild_members')
            .values({
                id: interaction.user.id,
                guildId: interaction.guild.id,
                statsOptedIn: false,
                joinedTimestamp: Date.now() / 1_000,
            })
            .onDuplicateKeyUpdate({
                statsOptedIn: false,
            })
            .execute();

        this.logger.info('Member opted-out of stats collection', {
            guildId: interaction.guild.id,
            memberId: interaction.user.id,
        });

        // Delete all existing stats about the user
        await database
            .deleteFrom('guild_member_stats')
            .where('memberId', '=', interaction.user.id)
            .execute();

        // Tell the user that we've disabled stats
        // and removed all existing stats for them.
        await interaction.editReply({
            embeds: [{
                title: 'Stats collection',
                description: outdent`
                    We've deleted all existing stats for you and are no longer collecting stats about you. 📊
                `,
            }],
            components: [],
        });
    }

    @Slash({
        name: 'stats',
        description: 'Get stats for this server.',
    })
    async stats(
        @SlashOption({
            name: 'ephemeral',
            description: 'Reply with a private message?',
            required: false,
            type: ApplicationCommandOptionType.Boolean,
        }) ephemeral = false,
        @SlashOption({
            name: 'period',
            description: 'Time period',
            required: false,
            type: ApplicationCommandOptionType.String,
            async autocomplete(interaction) {
                await interaction.respond([{
                    name: 'last 24 hours',
                    value: 'day',
                }, {
                    name: 'last 7 days',
                    value: 'week',
                }, {
                    name: 'last 30 days',
                    value: 'month',
                }, {
                    name: 'total',
                    value: 'total',
                }])
            },
        }) period: 'day' | 'week' | 'month' | 'total' = 'day',
        @SlashOption({
            name: 'show-oldest-members',
            description: 'Show oldest members?',
            required: false,
            type: ApplicationCommandOptionType.Boolean,
        }) showOldestMembers = false,
        @SlashOption({
            name: 'private-channels',
            description: 'Show non-public channels?',
            required: false,
            type: ApplicationCommandOptionType.Boolean,
        }) privateChannels = false,
        interaction: CommandInteraction,
    ) {
        // Only run in guilds
        if (!interaction.guild?.id) return;

        // Show the bot thinking
        if (!interaction.deferred) await interaction.deferReply({ ephemeral, });

        // Create embeds array
        const embeds = [];

        // Get the most active channels from the period selected
        const mostActiveChannels = await database
            .selectFrom('channel_stats')
            .select('channelId')
            .select(database.fn.sum<number>('count').as('totalCount'))
            .where('date', '>=', timePeriod(period))
            .where('guildId', '=', interaction.guild.id)
            .groupBy('channelId')
            .orderBy('totalCount', 'desc')
            .limit(10)
            .execute()
            .then(channels => {
                // Show all channels
                // Official client: Users will only see the names of channels they have access to
                // Unofficial client: Anyone will see the names of the channels 👀
                // NOTE: Because of this, we do not consider these IDs to be private information
                if (privateChannels) return channels;

                // Only show public channels
                return channels.filter(channel => {
                    const isPublic = interaction.guild?.channels.resolve(channel.channelId)?.permissionsFor(interaction.guild.id)?.has('ViewChannel');
                    const isForVerified = interaction.guild?.channels.resolve(channel.channelId)?.permissionsFor('965589467832401950')?.has('ViewChannel');
                    return isPublic || isForVerified;
                });
            });

        embeds.push({
            title: `Most active channels [${period}]`,
            description: outdent`
                ${mostActiveChannels.map(channel => `<#${channel.channelId}> - ${channel.totalCount} messages`).join('\n')}
            `
        });

        // Get the most active members from the period selected
        const mostActiveMembers = await database
            .selectFrom('guild_member_stats')
            .select('memberId')
            .select(database.fn.sum<number>('count').as('totalCount'))
            .where('date', '>=', timePeriod(period))
            .where('guildId', '=', interaction.guild.id)
            .groupBy('memberId')
            .orderBy('totalCount', 'desc')
            .limit(10)
            .execute();

        embeds.push({
            title: `Most active members [${period}]`,
            description: outdent`
                ${mostActiveMembers.map(member => `<@${member.memberId}> - ${member.totalCount} messages`).join('\n')}

                Use \`/opt-in\` to opt into stats collection.
            `
        });

        // Only show this if the user asks
        if (showOldestMembers) {
            // Get the members who have been in this guild the longest
            const oldestMembers = await database
                .selectFrom('guild_members')
                .select('id')
                .select('joinedTimestamp')
                .where('guildId', '=', interaction.guild.id)
                .orderBy('joinedTimestamp', 'asc')
                .limit(10)
                .execute()
                .then(members => {
                    // Only show members that resolve
                    return members.filter(member => {
                        return interaction.guild?.members.resolve(member.id)?.displayName !== undefined;
                    });
                });

            embeds.push({
                title: 'Oldest members',
                description: outdent`
                    ${oldestMembers.map(member => `<@${member.id}> - <t:${member.joinedTimestamp}:R>`).join('\n')}
                `
            });
        }

        // Reply with the stats
        await interaction.editReply({
            embeds,
        });
    }
}
