import { ApplicationCommandOptionType, ChannelType, CommandInteraction, EmbedBuilder, GuildMember, PermissionFlagsBits, VoiceChannel } from 'discord.js';
import { ArgsOf, Discord, On, Slash, SlashOption } from 'discordx';
import { globalLogger } from '@app/logger';
import { prisma } from '@app/common/prisma-client';
import { levelService } from '@app/features/leveling/service';
import { outdent } from 'outdent';
import { client } from '@app/client';
import { store } from '@app/store';
import mee6LevelsApi from 'mee6-levels-api';
import { Features, isFeatureEnabled } from '@app/common/is-feature-enabled';

@Discord()
export class Feature {
    private logger = globalLogger.scope('Leveling');

    constructor() {
        this.logger.success('Feature initialized');
    }

    @On({ event: 'ready' })
    async ready(): Promise<void> {
        // Fetch each guild that has this feature enabled
        const guilds = await prisma.guild.findMany({
            where: {
                settings: {
                    leveling: {
                        enabled: true
                    }
                }
            },
            include: {
                settings: {
                    include: {
                        leveling: true
                    }
                }
            }
        });

        for (const guild of guilds) {
            // Get all the users who are currently in voice channels
            await client.guilds.cache.get(guild.id)?.channels.fetch();
            client.guilds.cache.get(guild.id)?.channels.cache
                .filter((channel) => channel.type === ChannelType.GuildVoice)
                .forEach((channel) => {
                    (channel as VoiceChannel).members.forEach((member) => {
                        this.logger.info('Adding "%s" to the usersInVC set', member.user.username);
                        const usersInVC = store.getState().usersInVC.get(member.guild.id)
                        if (!usersInVC) store.setState({ usersInVC: new Map([[member.guild.id, new Set(member.id)]]) });
                        else usersInVC.delete(member.id);
                    });
                });
        }
    }

    @On({ event: 'messageCreate' })
    async messageCreate([message]: ArgsOf<'messageCreate'>): Promise<void> {
        if (!await isFeatureEnabled(Features.LEVELING, message.guild?.id)) return;

        // Check if the message was sent in a guild
        if (!message.guild?.id) return;

        // Check if the message was sent in a guild text channel
        if (message.channel.type !== ChannelType.GuildText) return;

        // Check if the message was sent by a bot
        if (message.author.bot) return;

        // Check if the message was sent in the #level-up channel
        // TODO: Make this configurable

        // @TODO: This name sucks
        // Add the user to the usersWhoChattedThisMinute set
        const usersWhoChattedThisMinute = store.getState().usersWhoChattedThisMinute.get(message.guild.id)
        if (!usersWhoChattedThisMinute) store.setState({ usersWhoChattedThisMinute: new Map([[message.guild.id, new Set(message.author.id)]]) });
        else usersWhoChattedThisMinute.add(message.author.id);
    }

    @On({ event: 'voiceStateUpdate' })
    async voiceStateUpdate([oldState, newState]: ArgsOf<'voiceStateUpdate'>): Promise<void> {
        if (!await isFeatureEnabled(Features.LEVELING, newState.guild?.id)) return;

        // Check if the user has joined a voice channel
        if (oldState.channelId === null && newState.channelId !== null) {
            // Add the user to the usersInVC set
            const usersInVC = store.getState().usersInVC.get(newState.guild.id)
            if (!usersInVC) store.setState({ usersInVC: new Map([[newState.guild.id, new Set(newState.id)]]) });
            else usersInVC.add(newState.id);
        }

        // Check if the user has left a voice channel
        if (oldState.channelId !== null && newState.channelId === null) {
            // Remove the user from the usersInVC set
            const usersInVC = store.getState().usersInVC.get(newState.guild.id)
            if (!usersInVC) store.setState({ usersInVC: new Map([[newState.guild.id, new Set(newState.id)]]) });
            else usersInVC.delete(newState.id);
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
            const user = await prisma.guildMember.findUnique({ where: { id: member?.id ?? interaction.member?.user.id } });
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
            globalLogger.error('Failed to get user\'s level + XP', error);
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
            const users = await prisma.guildMember.findMany({
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
            this.logger.error('Failed to get leaderboard', error);
            await interaction.reply({
                content: 'Failed to get the leaderboard, please let a member of staff know.',
                ephemeral: true,
            });
        }
    }

    @Slash({
        name: 'import-mee6',
        description: 'Import your Mee6 levels and XP',
    })
    async importMee6(
        interaction: CommandInteraction
    ) {
        // Don't handle users with weird permissions
        if (typeof interaction.member?.permissions === 'string') return;

        // Don't handle DMs
        if (!interaction.guild?.id) return;

        // Check if the user has the MANAGE_GUILD permission
        if (!interaction.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
            await interaction.reply({
                embeds: [{
                    description: 'You do not have the `MANAGE_GUILD` permission.'
                }]
            });
            return;
        }

        // Defer the reply so the user doesn't get a "This interaction failed" message
        await interaction.deferReply({ ephemeral: false });

        try {
            this.logger.info('Fetching the leaderboard for guild "%s"', interaction.guild.name);

            // Get the Mee6 leaderboard
            const leaderboard = await mee6LevelsApi.getLeaderboard(interaction.guild.id);

            // Import the leaderboard
            this.logger.info('Importing the leaderboard for guild "%s", this consists of %s members', interaction.guild.name, leaderboard.length);
            await interaction.editReply({
                content: 'Importing the leaderboard, this may take a while...'
            });

            for (const user of leaderboard) {
                await prisma.guildMember.upsert({
                    where: {
                        id: user.id
                    },
                    update: {
                        xp: user.xp.totalXp
                    },
                    create: {
                        id: user.id,
                        xp: user.xp.totalXp,
                        coins: 0,
                        guild: {
                            connect: {
                                id: interaction.guild.id
                            }
                        }
                    }
                });
            }

            this.logger.success('Successfully imported the leaderboard for guild "%s" with %s members', interaction.guild.name, leaderboard.length);

            // Tell the user that the leaderboard has been imported
            await interaction.editReply({
                content: 'Successfully imported the leaderboard, please note that this will not import your roles.',
            });
        } catch (error: unknown) {
            if (!(error instanceof Error)) throw new Error('Unknown Error: ' + error);
            this.logger.error('Failed to import the leaderboard', error);
            await interaction.reply({
                content: 'Failed to import the leaderboard, please let a member of staff know.',
                ephemeral: true,
            });
        }
    }
}