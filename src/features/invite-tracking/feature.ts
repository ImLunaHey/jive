import { ArgsOf, Discord, On } from 'discordx';
import { logger } from '@app/logger';
import { prisma } from '@app/common/prisma-client';
import { client } from '@app/client';
import { ChannelType } from 'discord.js';

@Discord()
export class Feature {
    constructor() {
        logger.success('InviteTracking feature initialized');
    }

    @On({ event: 'ready' })
    async ready(): Promise<void> {
        const guild = client.guilds.cache.get('927461441051701280');
        if (!guild) return;
        const invites = await guild.invites.fetch();

        for (const invite of invites.values()) {
            // Update the invite uses
            await this.setInviteUses(invite.guild?.id, invite.code, invite.uses ?? 1);
        }
    }

    @On({ event: 'inviteCreate' })
    async inviteCreate([invite]: ArgsOf<'inviteCreate'>): Promise<void> {
        // Update the invite uses
        this.setInviteUses(invite.guild?.id, invite.code, invite.uses ?? 1);
    }

    @On({ event: 'guildMemberAdd' })
    async guildMemberAdd([member]: ArgsOf<'guildMemberAdd'>): Promise<void> {
        // Fetch the invites before the user joined
        const guildInvitesBeforeUserJoined = await prisma.invite.findMany({
            where: {
                guildId: member.guild.id,
            },
        });

        // Fetch the invites after the user joined
        const guildInvitesNow = await member.guild.invites.fetch();

        // Find the invite that was used
        const inviteUsed = guildInvitesNow.find((invite) => {
            const inviteBeforeUserJoined = guildInvitesBeforeUserJoined.find((inviteBefore) => inviteBefore.code === invite.code);
            return inviteBeforeUserJoined?.uses !== invite.uses;
        });

        // Skip if the invite wasn't found
        if (!inviteUsed) return;

        // Update the invite uses
        this.setInviteUses(inviteUsed.guild?.id, inviteUsed.code, inviteUsed.uses ?? 1);

        // Send a message to the invite creator
        // const inviteCreator = await client.users.fetch(inviteUsed.inviter?.id ?? '');
        // inviteCreator.send(`Someone joined using your invite: ${inviteUsed.url}`);

        // Post a message in the welcome channel
        const welcomeChannel = member.guild.channels.cache.get('1042598577156919376');
        if (welcomeChannel?.type !== ChannelType.GuildText) return;
        welcomeChannel?.send(`Welcome ${member}!`);
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
                    connectOrCreate: {
                        where: {
                            id: guildId
                        },
                        create: {
                            id: guildId
                        }
                    }
                },
            }
        });
    }
}
