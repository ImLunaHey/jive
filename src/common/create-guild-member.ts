import { prisma } from '@app/common/prisma-client';
import { CommandInteraction } from 'discord.js';
import { Client, Next } from 'discordx';

const createGuildMember = async (guildId: string, userId: string) => {
    return prisma.guildMember.upsert({
        where: { id: userId },
        update: {},
        create: {
            id: userId,
            guild: {
                connect: {
                    id: guildId
                }
            }
        }
    });
};

export const GuildMemberGuard = async (interaction: CommandInteraction, _client: Client, next: Next) => {
    if (!interaction.guild?.id) return;
    if (!interaction.member?.user.id) return;

    // Ensure the user has a profile
    await createGuildMember(interaction.guild.id, interaction.member.user.id);

    return next();
};