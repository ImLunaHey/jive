import { type ArgsOf, Discord, On, Slash, SlashOption } from 'discordx';
import { globalLogger } from '@app/logger';
import { client } from '@app/client';
import { ApplicationCommandOptionType, ChannelType, Colors, CommandInteraction, GuildMember, User } from 'discord.js';
import { isFeatureEnabled } from '@app/common/is-feature-enabled';
import { db } from '@app/common/database';

@Discord()
export class Feature {
    private logger = globalLogger.child({ service: 'InviteTracking' });

    constructor() {
        this.logger.info('Initialised');
    }

    @On({ event: 'ready' })
    async ready(): Promise<void> {
        // Fetch all the guilds
        await client.guilds.fetch();

        this.logger.info('Backfilling invites for guilds', {
            guildCount: client.guilds.cache.size,
        });

        // Update the invite uses for all guilds
        for (const [guildId, guild] of client.guilds.cache) {
            if (!await isFeatureEnabled('INVITE_TRACKING', guildId)) continue;

            // Fetch the invites
            this.logger.debug('Fetching invites for guild', { guildId });
            const invites = await guild.invites.fetch();
            this.logger.debug('Fetched invites for guild', { guildId, inviteCount: invites?.size ?? 0 });

            // Update the invite uses
            for (const [, invite] of invites) {
                if (!invite.inviter?.id) continue;

                // Update the invite uses
                await db
                    .insertInto('invites')
                    .values({
                        code: invite.code,
                        uses: invite.uses ?? 0,
                        guildId,
                        memberId: invite.inviter?.id,
                    })
                    .onDuplicateKeyUpdate({
                        uses: invite.uses ?? 0,
                    })
                    .execute();
            }

            // Fetch the vanity URL
            const vanityData = await guild.fetchVanityData();

            // Update the invite uses
            if (vanityData.code) {
                await db
                    .insertInto('invites')
                    .ignore()
                    .values({
                        code: vanityData.code,
                        uses: vanityData.uses ?? 0,
                        guildId,
                        memberId: guild.ownerId,
                    })
                    .execute();
            }
        }
    }

    @On({ event: 'guildUpdate' })
    async guildUpdate([oldGuild, newGuild]: ArgsOf<'guildUpdate'>) {
        if (!await isFeatureEnabled('INVITE_TRACKING', newGuild.id)) return;

        // If the url is the same skip
        if (oldGuild.vanityURLCode === newGuild.vanityURLCode) return;

        // If the url was removed skip
        if (!newGuild.vanityURLCode) return;

        // Update the invite uses
        await db
            .insertInto('invites')
            .ignore()
            .values({
                code: newGuild.vanityURLCode,
                uses: 0,
                guildId: newGuild.id,
                memberId: newGuild.ownerId,
            })
            .execute();
    }

    @On({ event: 'inviteCreate' })
    async inviteCreate([invite]: ArgsOf<'inviteCreate'>): Promise<void> {
        if (!invite.guild?.id || !invite.inviter?.id) return;

        // Update the invite uses
        await db
            .insertInto('invites')
            .ignore()
            .values({
                code: invite.code,
                uses: invite.uses ?? 0,
                guildId: invite.guild.id,
                memberId: invite.inviter.id,
            })
            .execute();
    }

    @On({ event: 'guildMemberAdd' })
    async guildMemberAdd([member]: ArgsOf<'guildMemberAdd'>): Promise<void> {
        // Fetch the invites before the user joined
        const guildInvitesBeforeUserJoined = await db
            .selectFrom('invites')
            .select('code')
            .select('uses')
            .where('guildId', '=', member.guild.id)
            .execute();

        // Fetch the invites after the user joined
        const guildInvitesNow = await member.guild.invites.fetch();

        // Find the invite code that was used
        const inviteCode = guildInvitesNow.map(aItem => {
            const bItem = guildInvitesBeforeUserJoined.find(item => item.code === aItem.code);
            if (!bItem || !aItem.uses) return { code: aItem.code, diff: 0 };
            const max = Math.max(aItem.uses, bItem.uses);
            const min = Math.min(aItem.uses, bItem.uses);
            return { code: aItem.code, diff: max - min };
        }).find(item => item.diff >= 1)?.code;

        // Find the invite that was used
        const inviteUsed = guildInvitesNow.find(invite => invite.code === inviteCode) ?? await member.guild.fetchVanityData().then(newVanityData => {
            if (!newVanityData.code) return undefined;
            const oldVanityData = guildInvitesBeforeUserJoined.find(invite => invite.code === newVanityData.code);
            if (oldVanityData && newVanityData.uses !== oldVanityData?.uses) return {
                code: newVanityData.code,
                uses: newVanityData.uses,
                inviter: member.guild.members.cache.get(member.guild.ownerId),
            };
            return undefined;
        });

        this.logger.info('Got invite data', { guildInvitesBeforeUserJoined, guildInvitesNow: guildInvitesNow.map(_ => ({ uses: _.uses, code: _.code })), inviteUsed });

        // Get the invite tracking settings
        const inviteTracking = await db
            .selectFrom('invite_tracking')
            .select('channelId')
            .where('guildId', '=', member.guild.id)
            .executeTakeFirst();

        // Skip if the feature is disabled
        if (!inviteTracking || !inviteTracking.channelId) return;

        // Post a message in the invite tracking channel
        const inviteTrackingChannel = member.guild.channels.cache.get(inviteTracking.channelId);
        if (inviteTrackingChannel?.type !== ChannelType.GuildText) return;

        if (!inviteUsed || !inviteUsed.inviter?.id) {
            await inviteTrackingChannel?.send({
                embeds: [{
                    title: 'Invite used',
                    description: `<@${member.id}> joined using an unknown invite`,
                }]
            });
            return;
        }

        // Update the invite uses
        await db
            .insertInto('invites')
            .ignore()
            .values({
                code: inviteUsed.code,
                uses: inviteUsed.uses ?? 1,
                guildId: member.guild.id,
                memberId: inviteUsed.inviter.id,
            })
            .onDuplicateKeyUpdate({
                uses: inviteUsed.uses ?? 1,
            })
            .execute();

        // Get the person who made this invite
        const inviter = inviteUsed.inviter.id ? `<@${inviteUsed.inviter?.id}>` : 'unknown';

        // Get the total count of invites for this user
        const totalInvites = await db
            .selectFrom('invites')
            .select(db.fn.sum<number>('uses').as('uses'))
            .where('memberId', '=', inviteUsed.inviter?.id)
            .executeTakeFirst();

        // Record who invited this member
        if (inviteUsed.inviter?.id) {
            await db
                .insertInto('guild_members')
                .values({
                    id: member.user.id,
                    guildId: member.guild.id,
                    joinedTimestamp: Math.floor(new Date().getTime() / 1_000),
                })
                .onDuplicateKeyUpdate({
                    invitedBy: inviteUsed.inviter.id,
                })
                .execute();
        }

        // Post a message in the invite tracking channel
        await inviteTrackingChannel?.send({
            embeds: [{
                title: 'Invite used',
                fields: [
                    {
                        name: 'Inviter',
                        value: inviter,
                        inline: true,
                    }, {
                        name: 'Total invites',
                        value: '`' + `${totalInvites?.uses ?? 1}` + '`',
                        inline: true,
                    }, {
                        name: '\u200B',
                        value: '\u200B',
                        inline: true,
                    }, {
                        name: 'Invitee',
                        value: `<@${member.id}>`,
                        inline: true,
                    }, {
                        name: 'Code',
                        value: '`' + inviteUsed.code + '`',
                        inline: true,
                    }, {
                        name: 'Uses',
                        value: '`' + `${inviteUsed.uses ?? 1}` + '`',
                        inline: true,
                    },
                ],
                color: Colors.Green,
            }]
        });
    }

    @Slash({
        name: 'invites',
        description: 'See how many people someone has invited.',
    })
    async invites(
        @SlashOption({
            name: 'member',
            description: 'Who to check',
            type: ApplicationCommandOptionType.User,
            required: false,
        })
        memberToCheck: GuildMember | undefined,
        interaction: CommandInteraction,
    ) {
        if (!interaction.guild?.id) return;

        // Show bot thinking
        if (!interaction.deferred) await interaction.deferReply();

        // Get the member to check or fall back to the member who used the command
        const memberId = memberToCheck?.id ?? interaction.user.id;
        if (!memberId) return;

        // Get invite count for member
        const totalInviteCount = await db
            .selectFrom('invites')
            .select(db.fn.sum<number>('uses').as('uses'))
            .where('memberId', '=', memberId)
            .executeTakeFirst()
            .then(invites => invites?.uses ?? 0);

        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1_000;

        // Get last 30d of invites for member
        const invitesInLast30Days = await db
            .selectFrom('guild_members')
            .select(db.fn.count<number>('id').as('count'))
            .where('invitedBy', '=', memberId)
            .where('joinedTimestamp', '>=', Math.floor((now - (oneDay * 30)) / 1_000))
            .executeTakeFirst()
            .then(members => members?.count ?? 0);

        // Get last 24h of invites for member
        // If invitesInLast30Days is 0 then we skip this query
        const invitesInLast24Hours = invitesInLast30Days >= 1 ? await db
            .selectFrom('guild_members')
            .select(db.fn.count<number>('id').as('count'))
            .where('invitedBy', '=', memberId)
            .where('joinedTimestamp', '>=', Math.floor((now - oneDay) / 1_000))
            .executeTakeFirst()
            .then(members => members?.count ?? 0) : 0;

        // Get the invite count for each member in the last 24 hours.
        const inviteCounts = await db
            .selectFrom('guild_members')
            .select('invitedBy')
            .select(db.fn.count<number>('id').as('count'))
            .where('joinedTimestamp', '>=', Math.floor((now - oneDay) / 1_000))
            .where('guildId', '=', interaction.guild.id)
            .groupBy('invitedBy')
            .execute();

        // Sort the members by their invite count in descending order.
        inviteCounts.sort((a, b) => b.count - a.count);

        // Find the index of the member whose position you want to determine in the sorted list.
        const memberIndex = inviteCounts.findIndex(inviteMember => inviteMember.invitedBy === memberId);

        // The index of the member in the sorted list plus one is their position.
        const memberPosition = memberIndex + 1;

        // Reply with invite count
        await interaction.editReply({
            embeds: [{
                title: 'Invite stats',
                fields: [{
                    name: 'Member',
                    value: `<@${memberId}>`,
                    inline: true,
                }, {
                    name: 'Invites (total)',
                    value: String(totalInviteCount),
                    inline: true,
                }, {
                    name: 'Invites (last 24h)',
                    value: String(invitesInLast24Hours),
                    inline: true,
                }, {
                    name: 'Invites (last 30d)',
                    value: String(invitesInLast30Days),
                    inline: true,
                }, {
                    name: 'Position (last 30d)',
                    value: memberPosition === 0 ? 'Not ranked' : String(memberPosition),
                    inline: true,
                }]
            }],
        });
    }
}
