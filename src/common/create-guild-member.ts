import { db } from '@app/common/database';
import type { CommandInteraction } from 'discord.js';
import type { Client, Next } from 'discordx';

const createGuildMember = async (guildId: string, userId: string) => {
    // Create the guild if need be
    await db
        .insertInto('guilds')
        .ignore()
        .values({
            id: guildId,
            coins: 0,
            enabled: false,
            ticketNumber: 1,
        })
        .execute();

    // Create the guild member
    await db
        .insertInto('guild_members')
        .values({
            id: userId,
            guildId,
            joinedTimestamp: new Date().getTime(),
        })
        .execute();
};

export const GuildMemberGuard = async (interaction: CommandInteraction, _client: Client, next: Next) => {
    if (!interaction.guild?.id) return;
    if (!interaction.member?.user.id) return;

    // Ensure the user has a profile
    await createGuildMember(interaction.guild.id, interaction.member.user.id);

    return next();
};