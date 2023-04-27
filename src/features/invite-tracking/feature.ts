import { type ArgsOf, Discord, On } from 'discordx';
import { globalLogger } from '@app/logger';
import { client } from '@app/client';
import { ChannelType } from 'discord.js';
import { FeatureId, isFeatureEnabled } from '@app/common/is-feature-enabled';
import { db } from '@app/common/database';

@Discord()
export class Feature {
    private logger = globalLogger.child({ service: 'InviteTracking' });

    constructor() {
        this.logger.info('Initialised');
    }

    @On({ event: 'ready' })
    async ready(): Promise<void> {
        await client.guilds.fetch();

        // Update the invite uses for all guilds
        for (const guildId in client.guilds.cache) {
            if (!await isFeatureEnabled(FeatureId.INVITE_TRACKING, guildId)) return;

            // Fetch the invites
            this.logger.debug(`Fetching invites for guild ${guildId}...`);
            const invites = await client.guilds.cache.get(guildId)?.invites.fetch();
            this.logger.debug(`Fetched ${invites?.size ?? 0} invites for guild ${guildId}`);

            // Update the invite uses
            for (const invite of invites?.values() ?? []) {
                await this.setInviteUses(invite.guild?.id, invite.code, invite.uses ?? 1);
            }
        }
    }

    @On({ event: 'inviteCreate' })
    async inviteCreate([invite]: ArgsOf<'inviteCreate'>): Promise<void> {
        // Update the invite uses
        await this.setInviteUses(invite.guild?.id, invite.code, invite.uses ?? 1);
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

        // Fetch the vanity invite data after the user joined
        // const vanityData = await member.guild.fetchVanityData();

        // Find the invite code that was used
        // TODO: Add support for vanity invites
        const inviteCode = guildInvitesBeforeUserJoined.find((invite) => {
            // // Check if the invite was a vanity invite
            // if (invite.code === vanityData.code && vanityData.uses !== guildInvitesBeforeUserJoined.find((invite) => invite.code === vanityData.code)?.uses) return true;

            // Check if the invite was a normal invite
            const inviteAfterJoined = guildInvitesNow.find((inviteBefore) => inviteBefore.code === invite.code);
            return inviteAfterJoined?.uses !== invite.uses;
        })?.code;

        // Find the invite that was used
        const inviteUsed = guildInvitesNow.find((invite) => invite.code === inviteCode);

        // Update the invite uses, skip if the invite is a DM invite
        if (inviteUsed) await this.setInviteUses(inviteUsed.guild?.id, inviteUsed.code, inviteUsed.uses ?? 1);

        // Get the invite tracking settings
        const inviteTracking = await db
            .selectFrom('invite_trackings')
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
        } else {
            // Post a message in the invite tracking channel
            await inviteTrackingChannel?.send({
                embeds: [{
                    title: 'Invite used',
                    description: `<@${member.id}> joined using invite ${inviteUsed.code}`,
                    fields: [
                        {
                            name: 'Uses',
                            value: inviteUsed.uses?.toString() ?? '1',
                            inline: true
                        },
                        {
                            name: 'Inviter',
                            value: inviteUsed.inviter?.toString() ?? 'Unknown',
                            inline: true
                        }
                    ]
                }]
            });
        }
    }

    async setInviteUses(guildId: string | undefined, code: string, uses = 1) {
        // Skip DM invites
        if (!guildId) return;

        // Update the invite uses
        await db
            .insertInto('invites')
            .values({
                code,
                uses,
                guildId,
            })
            .onDuplicateKeyUpdate({
                uses,
            })
            .execute();
    }
}
