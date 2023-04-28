import { client } from '@app/client';
import { db } from '@app/common/database';
import { getDate } from '@app/common/get-date';
import { timeLength } from '@app/common/time';
import { service } from '@app/features/stats/service';
import { globalLogger } from '@app/logger';
import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, TextChannel } from 'discord.js';
import { type ArgsOf, Discord, On, Slash, ButtonComponent, SlashOption } from 'discordx';
import { outdent } from 'outdent';

@Discord()
export class Feature {
    private logger = globalLogger.child({ service: 'Stats' });

    constructor() {
        this.logger.info('Initialised');
    }

    @On({
        event: 'messageCreate'
    })
    async onMessageCreate([message]: ArgsOf<'messageCreate'>) {
        if (!message.guild?.id) return;

        this.logger.info('New message', {
            guildId: message.guild?.id,
            channelId: message.channel.id,
        });

        // Record a new message happened
        await service.newMessage(message);
    }

    @On({
        event: 'guildMemberRemove'
    })
    async guildMemberRemove(
        [member]: ArgsOf<'guildMemberRemove'>
    ) {
        // If we don't know when they joined just bail
        if (!member.joinedTimestamp) return;

        // Check how long they were here in ms
        const diffMs = new Date().getTime() - member.joinedTimestamp;

        // Get the current fastest leave time
        const guildStats = await db
            .selectFrom('guild_stats')
            .select('fastestLeave')
            .where('guildId', '=', member.guild.id)
            .executeTakeFirst();

        // This wasn't a new record
        if (!guildStats?.fastestLeave || (diffMs > guildStats?.fastestLeave)) return;

        // Post that we have a new fastest
        const channel = client.channels.resolve('957109896313184316') as TextChannel;
        await channel.send({
            embeds: [{
                title: 'New leave record! 🥇',
                fields: [{
                    name: 'Name',
                    value: member.displayName,
                    inline: true,
                }, {
                    name: 'Account Created',
                    value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
                    inline: true,
                }, {
                    name: 'Time here',
                    value: member.joinedTimestamp ? timeLength(new Date(member.joinedTimestamp)) : 'Unknown',
                    inline: true,
                }]
            }]
        });

        // Update the database
        await db
            .insertInto('guild_stats')
            .values({
                guildId: member.guild.id,
                fastestLeave: diffMs,
            })
            .onDuplicateKeyUpdate({
                fastestLeave: diffMs,
            })
            .execute();
    }

    @Slash({
        name: 'opt-in',
        description: 'Opt into stats collection.',
    })
    async optIn(
        interaction: CommandInteraction,
    ) {
        // Only allow this in guilds
        if (!interaction.guild?.id) return;

        // Show the bot thinking
        if (!interaction.deferred) await interaction.deferReply({ ephemeral: true, });

        // Check if the user is already opted-in
        const isOptedIn = await service.isMemberOptedIn(interaction.guild?.id, interaction.user.id);

        // Tell the member they're already opted in.
        if (isOptedIn) {
            await interaction.editReply({
                embeds: [{
                    title: 'Stats collection',
                    description: outdent`
                        You're already opted in. 📊
                    `,
                }],
            });

            return;
        }

        // Mark that this user opted into stats collection
        await db
            .insertInto('guild_members')
            .values({
                id: interaction.user.id,
                guildId: interaction.guild.id,
                statsOptedIn: true,
            })
            .onDuplicateKeyUpdate({
                statsOptedIn: true,
            })
            .execute();

        // Tell the user that we've enabled stats for them.
        await interaction.editReply({
            embeds: [{
                title: 'Stats collection',
                description: outdent`
                    We're now collecting stats about you. 📊

                    Thanks for opting in.
                `,
            }]
        });
    }

    @Slash({
        name: 'opt-out',
        description: 'Opt out of stats collection.',
    })
    async optOut(
        interaction: CommandInteraction,
    ) {
        // Only allow this in guilds
        if (!interaction.guild?.id) return;

        // Show the bot thinking
        if (!interaction.deferred) await interaction.deferReply({ ephemeral: true, });

        // Check if the user is already opted-in
        const isOptedIn = await service.isMemberOptedIn(interaction.guild?.id, interaction.user.id);

        // Tell the member they're not opted in
        if (!isOptedIn) {
            await interaction.editReply({
                embeds: [{
                    title: 'Stats collection',
                    description: outdent`
                        You're not opted in. 📊
                    `,
                }],
            });

            return;
        }

        // Ask the user if they're sure they want to opt-out.
        await interaction.editReply({
            embeds: [{
                title: 'Stats collection',
                description: outdent`
                    Are you sure you want to opt-out? 📊

                    This will disable stats collection from now on and delete all your existing stats.
                `,
            }],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId('opt-out-yes')
                            .setLabel('Yes')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('opt-out-no')
                            .setLabel('No')
                            .setStyle(ButtonStyle.Secondary)
                    ])
            ]
        });
    }

    @ButtonComponent({
        id: 'opt-out-no'
    })
    async optOutNo(
        interaction: ButtonInteraction,
    ) {
        // Show the bot thinking
        if (!interaction.deferred) await interaction.deferUpdate();

        // Let them know nothing happened
        await interaction.editReply({
            embeds: [{
                title: 'Stats collection',
                description: outdent`
                        You hit \`no\`. 📊
                    `,
            }],
            components: [],
        });
    }

    @ButtonComponent({
        id: 'opt-out-yes'
    })
    async optOutConfirmation(
        interaction: ButtonInteraction,
    ) {
        // Only allow this in guilds
        if (!interaction.guild?.id) return;

        // Show the bot thinking
        if (!interaction.deferred) await interaction.deferUpdate();

        // Mark that this user opted into stats collection
        await db
            .insertInto('guild_members')
            .values({
                id: interaction.user.id,
                guildId: interaction.guild.id,
                statsOptedIn: true,
            })
            .onDuplicateKeyUpdate({
                statsOptedIn: false,
            })
            .execute();

        // Delete all existing stats about the user
        await db
            .deleteFrom('guild_member_stats')
            .where('memberId', '=', interaction.user.id)
            .execute();

        // Tell the user that we've disabled stats
        // and removed all existing stats for them.
        await interaction.editReply({
            embeds: [{
                title: 'Stats collection',
                description: outdent`
                    We've deleted all existing stats for you and are no longer collecting stats about you. 📊
                `,
            }],
            components: [],
        });
    }

    @Slash({
        name: 'stats',
        description: 'Get stats for this server.',
    })
    async stats(
        @SlashOption({
            name: 'private',
            description: 'Reply with a private message?',
            required: false,
            type: ApplicationCommandOptionType.Boolean,
        }) ephemeral = false,
        interaction: CommandInteraction,
    ) {
        // Show the bot thinking
        if (!interaction.deferred) await interaction.deferReply({ ephemeral, });

        // Get the most active channels for today
        const mostActiveChannels = await db
            .selectFrom('channel_stats')
            .select('channelId')
            .select(db.fn.sum<number>('count').as('totalCount'))
            .where('date', '=', getDate())
            .groupBy('channelId')
            .orderBy('totalCount', 'desc')
            .execute();

        // Get the most active members for today
        const mostActiveMembers = await db
            .selectFrom('guild_member_stats')
            .select('memberId')
            .select(db.fn.sum<number>('count').as('totalCount'))
            .where('date', '=', getDate())
            .groupBy('memberId')
            .orderBy('totalCount', 'desc')
            .execute();

        // Reply with the stats
        await interaction.editReply({
            embeds: [{
                title: 'Most active channels today',
                description: outdent`
                    ${mostActiveChannels.map(channel => `<#${channel.channelId}> - ${channel.totalCount} messages`).join('\n')}
                `
            }, {
                title: 'Most active members today',
                description: outdent`
                    ${mostActiveMembers.map(member => `<@${member.memberId}> - ${member.totalCount} messages`).join('\n')}

                    Use \`/opt-in\` to opt into stats collection.
                `
            }]
        });
    }
}
