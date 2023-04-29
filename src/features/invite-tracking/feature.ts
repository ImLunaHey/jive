import { type ArgsOf, Discord, On } from 'discordx';
import { globalLogger } from '@app/logger';
import { client } from '@app/client';
import { ChannelType } from 'discord.js';
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

        // Update the invite uses for all guilds
        for (const guildId in client.guilds.cache) {
            if (!await isFeatureEnabled('INVITE_TRACKING', guildId)) continue;

            // Get the guild
            const guild = client.guilds.cache.get(guildId);
            if (!guild) continue;

            // Fetch the invites
            this.logger.debug('Fetching invites for guild', {
                guildId,
            });
            const invites = await guild.invites.fetch();
            this.logger.debug('Fetched invites for guild', {
                guildId,
                inviteCount: invites?.size ?? 0,
            });

            // Update the invite uses
            for (const invite of invites?.values() ?? []) {
                // Update the invite uses
                await db
                    .insertInto('invites')
                    .values({
                        code: invite.code,
                        uses: invite.uses ?? 0,
                        guildId,
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
            })
            .execute();
    }

    @On({ event: 'inviteCreate' })
    async inviteCreate([invite]: ArgsOf<'inviteCreate'>): Promise<void> {
        if (!invite.guild?.id) return;

        // Update the invite uses
        await db
            .insertInto('invites')
            .ignore()
            .values({
                code: invite.code,
                uses: invite.uses ?? 0,
                guildId: invite.guild.id,
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
        const inviteCode = guildInvitesBeforeUserJoined.find(invite => {
            const inviteAfterJoined = guildInvitesNow.find(inviteBefore => inviteBefore.code === invite.code);
            return inviteAfterJoined?.uses !== invite.uses
        })?.code;

        // Find the invite that was used
        const inviteUsed = guildInvitesNow.find(invite => invite.code === inviteCode) ?? await member.guild.fetchVanityData().then(newVanityData => {
            if (!newVanityData.code) return undefined;
            const oldVanityData = guildInvitesBeforeUserJoined.find(invite => invite.code === newVanityData.code);
            if (oldVanityData && newVanityData.uses > oldVanityData?.uses) return {
                code: newVanityData.code,
                uses: newVanityData.uses,
                inviter: member.guild.members.cache.get(member.guild.ownerId),
            };
            return undefined;
        });

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

        if (!inviteUsed) {
            await inviteTrackingChannel?.send({
                embeds: [{
                    title: 'Invite used',
                    description: `<@${member.id}> joined using an unknown invite`,
                }]
            });
            return;
        }

        // Post a message in the invite tracking channel
        await inviteTrackingChannel?.send({
            embeds: [{
                title: 'Invite used',
                description: `<@${member.id}> was invited by ${inviteUsed.inviter?.id ? `<@${inviteUsed.inviter?.id}>` : 'unknown'}`,
                fields: [
                    {
                        name: 'Uses',
                        value: inviteUsed.uses?.toString() ?? '1',
                        inline: true
                    }
                ]
            }]
        });
    }
}
