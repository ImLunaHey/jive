import { type ArgsOf, Discord, On } from 'discordx';
import { globalLogger } from '@app/logger';
import { client } from '@app/client';
import { ChannelType, Colors } from 'discord.js';
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
        const inviter = inviteUsed.inviter?.id ? `<@${inviteUsed.inviter?.id}>` : 'unknown';

        // Get the total count of invites for this user
        const totalInvites = await db
            .selectFrom('invites')
            .select(db.fn.sum<number>('uses').as('uses'))
            .where('memberId', '=', inviteUsed.inviter?.id)
            .executeTakeFirst();

        // Record who invited this member
        if (inviteUsed.inviter?.id) {
            await db
                .updateTable('guild_members')
                .set({
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
                        name: 'Code',
                        value: inviteUsed.code,
                        inline: true,
                    }, {
                        name: 'Uses',
                        value: `${inviteUsed.uses ?? 1}`,
                        inline: true,
                    }, {
                        name: 'Inviter',
                        value: inviter,
                        inline: true,
                    }, {
                        name: 'Invitee',
                        value: `${member.displayName} <@${member.id}>`,
                        inline: true,
                    }, {
                        name: 'Total invites',
                        value: `${totalInvites?.uses ?? 1}`,
                        inline: true,
                    },
                ],
                color: Colors.Green,
            }]
        });
    }
}
