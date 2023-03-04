import { ApplicationCommandOptionType, ChannelType, CommandInteraction, EmbedBuilder, GuildMember, VoiceChannel } from 'discord.js';
import { ArgsOf, Discord, On, Slash, SlashOption } from 'discordx';
import { logger } from '@app/logger';
import { prisma } from '@app/common/prisma-client';
import { levelService } from '@app/features/leveling/service';
import { outdent } from 'outdent';
import { client } from '@app/client';
import { store } from '@app/store';

@Discord()
export class Feature {
    constructor() {
        logger.success('Leveling feature initialized');
    }

    @On({ event: 'ready' })
    async ready(): Promise<void> {
        // Get all the users who are currently in voice channels
        await client.guilds.cache.get('927461441051701280')?.channels.fetch();
        client.guilds.cache.get('927461441051701280')?.channels.cache
            .filter((channel) => channel.type === ChannelType.GuildVoice)
            .forEach((channel) => {
                (channel as VoiceChannel).members.forEach((member) => {
                    logger.info('Adding "%s" to the usersInVC set', member.user.username);
                    store.getState().usersInVC.add(member.id);
                });
            });
    }

    @On({ event: 'messageCreate' })
    async messageCreate([message]: ArgsOf<'messageCreate'>): Promise<void> {
        // Add the user to the usersWhoChattedThisMinute set
        store.getState().usersWhoChattedThisMinute.add(message.author.id);
    }

    @On({ event: 'voiceStateUpdate' })
    async voiceStateUpdate([oldState, newState]: ArgsOf<'voiceStateUpdate'>): Promise<void> {
        // Check if the user has joined a voice channel
        if (oldState.channelId === null && newState.channelId !== null) {
            // Add the user to the usersInVC set
            store.getState().usersInVC.add(newState.id);
        }

        // Check if the user has left a voice channel
        if (oldState.channelId !== null && newState.channelId === null) {
            // Remove the user from the usersInVC set
            store.getState().usersInVC.delete(oldState.id);
        }
    }

    @Slash({
        name: 'level',
        description: 'Get your level and XP',
    })
    async getLevel(
        @SlashOption({
            name: 'member',
            description: 'The member to get the level and XP of',
            type: ApplicationCommandOptionType.User,
        }) member: GuildMember | undefined,
        interaction: CommandInteraction
    ) {
        try {
            const user = await prisma.user.findUnique({ where: { id: member?.id ?? interaction.member?.user.id } });
            const xp = user?.xp ?? 0;
            await interaction.reply({
                embeds: [
                    new EmbedBuilder({
                        description: outdent`
                            ${member ? `<@${member.id}>` : 'Your'} level is ${levelService.getLevel(xp)} and ${member ? 'they' : 'you'} have ${xp} XP.
                            ${member ? `<@${member.id}> needs` : 'You need'} another ${levelService.convertLevelToXp(levelService.getLevel(xp) + 1) - xp} XP to level up.
            
                            Level Progress: ${levelService.getLevelProgress(xp)}%

                            To see the leaderboard, use \`/leaderboard\`
                        `
                    })
                ]
            });
        } catch (error: unknown) {
            if (!(error instanceof Error)) throw new Error('Unknown Error: ' + error);
            logger.error('Failed to get user\'s level + XP', error);
            await interaction.reply({
                content: 'Failed to get your levels + XP, please let a member of staff know.',
                ephemeral: true,
            });
        }
    }

    @Slash({
        name: 'leaderboard',
        description: 'Get the leaderboard',
    })
    async getLeaderboard(
        interaction: CommandInteraction
    ) {
        // Defer the reply so the user doesn't get a "This interaction failed" message
        await interaction.deferReply({ ephemeral: false });

        try {
            const users = await prisma.user.findMany({
                orderBy: {
                    xp: 'desc'
                },
                take: 10
            });

            const leaderboard = await Promise.all(users.map(async (user, index) => {
                const discordUser = client.users.cache.get(user.id) ?? await client.users?.fetch(user.id).catch(() => null) ?? 'Unknown';
                return `${index + 1}. ${discordUser} - Level ${levelService.getLevel(user.xp)} - ${user.xp} XP`;
            })).then(result => result.join('\n'));

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder({
                        description: outdent`
                            **Leaderboard**
                            ${leaderboard}
                        `
                    })
                ]
            });
        } catch (error: unknown) {
            if (!(error instanceof Error)) throw new Error('Unknown Error: ' + error);
            logger.error('Failed to get leaderboard', error);
            await interaction.reply({
                content: 'Failed to get the leaderboard, please let a member of staff know.',
                ephemeral: true,
            });
        }
    }
}