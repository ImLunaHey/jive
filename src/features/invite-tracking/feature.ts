import { type ArgsOf, Discord, On } from 'discordx';
import { globalLogger } from '@app/logger';
import { prisma } from '@app/common/prisma-client';
import { client } from '@app/client';
import { ChannelType } from 'discord.js';
import { Features, isFeatureEnabled } from '@app/common/is-feature-enabled';

@Discord()
export class Feature {
    private logger = globalLogger.scope('InviteTracking');

    constructor() {
        this.logger.success('Feature initialized');
    }

    @On({ event: 'ready' })
    async ready(): Promise<void> {
        await client.guilds.fetch();

        // Update the invite uses for all guilds
        for (const guildId in client.guilds.cache) {
            if (!await isFeatureEnabled(Features.INVITE_TRACKING, guildId)) return;

            // Fetch the invites
            this.logger.debug(`Fetching invites for guild ${guildId}...`);
            const invites = await client.guilds.cache.get(guildId)?.invites.fetch();
            this.logger.debug(`Fetched ${invites?.size} invites for guild ${guildId}`);

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
        const guildInvitesBeforeUserJoined = await prisma.invite.findMany({
            where: {
                guildId: member.guild.id,
            },
            include: {
                guild: true
            }
        });

        // Fetch the invites after the user joined
        const guildInvitesNow = await member.guild.invites.fetch();

        // Fetch the vanity invite data after the user joined
        // const vanityData = await member.guild.fetchVanityData();

        // Find the invite code that was used
        // TODO: #1:6h/dev Add support for vanity invites
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
        if (inviteUsed) this.setInviteUses(inviteUsed.guild?.id, inviteUsed.code, inviteUsed.uses ?? 1);

        // Skip if the feature is disabled
        const settings = await prisma.settings.findFirst({
            where: {
                guild: {
                    id: member.guild.id
                },

            },
            include: {
                inviteTracking: true
            }
        });
        if (!settings) return;
        if (!settings.inviteTracking?.channelId) return;

        // Post a message in the invite tracking channel
        const inviteTrackingChannel = member.guild.channels.cache.get(settings.inviteTracking.channelId);
        if (inviteTrackingChannel?.type !== ChannelType.GuildText) return;

        if (!inviteUsed) {
            await inviteTrackingChannel?.send({
                embeds: [{
                    title: 'Invite used',
                    description: `${member} joined using an unknown invite`,
                }]
            });
        } else {
            // Post a message in the invite tracking channel
            await inviteTrackingChannel?.send({
                embeds: [{
                    title: 'Invite used',
                    description: `${member} joined using invite ${inviteUsed.code}`,
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

    async setInviteUses(guildId: string | undefined, code: string, uses: number) {
        // Skip DM invites
        if (!guildId) return;

        // Update the invite uses
        await prisma.invite.upsert({
            where: {
                code
            },
            update: {
                uses: uses ?? 1
            },
            create: {
                code,
                uses: uses ?? 1,
                guild: {
                    connect: {
                        id: guildId
                    }
                },
            }
        });
    }
}
