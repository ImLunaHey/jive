import { db } from '@app/common/database';
import { Logger } from '@app/logger';
import { ApplicationCommandOptionType, CommandInteraction } from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';
import * as sd from 'simple-duration';

const parseTime = (input?: string) => {
    if (!input) return { name: '5m', value: String(new Date().getTime() + ((60 * 1_000) * 5)) };

    try {
        const time = sd.parse(input);
        return {
            name: sd.stringify(time),
            value: String(time),
        };
    } catch { }

    return { name: '5m', value: String(new Date().getTime() + ((60 * 1_000) * 5)) };
}

@Discord()
export class Feature {
    private logger = new Logger({ service: 'Stats' });

    constructor() {
        this.logger.info('Initialised');
    }

    @Slash({
        name: 'remind-me',
        description: 'Send you a reminder DM at a certain time.',
        defaultMemberPermissions: 'Administrator',
    })
    async stats(
        @SlashOption({
            name: 'time',
            description: 'When should the reminder go off? (format 1d 5h 10m 30s)',
            required: true,
            type: ApplicationCommandOptionType.Number,
            async autocomplete(interaction) {
                const selected = interaction.options.getString('time')?.toLowerCase();
                const parsed = parseTime(selected);
                await interaction.respond([parsed]);
            },
        }) timestamp: number,
        @SlashOption({
            name: 'reason',
            description: 'Whats the reason for the reminder?',
            required: false,
            maxLength: 255,
            type: ApplicationCommandOptionType.String,
        }) reason: string | undefined,
        interaction: CommandInteraction,
    ) {
        // Only run in guilds
        if (!interaction.guild?.id) return;

        // Show the bot thinking
        if (!interaction.deferred) await interaction.deferReply({ ephemeral: true, });

        // Save reminder to database
        await db
            .insertInto('reminders')
            .values({
                memberId: interaction.user.id,
                guildId: interaction.guild.id,
                reason,
                timestamp: new Date(timestamp),
            })
            .execute();

        // Reply saying the reminder has been scheduled
        await interaction.editReply({
            embeds: [{
                title: 'Reminder',
                description: `You will be reminded ${reason ? `about "\`${reason}\`"` : ''} ${sd.stringify(timestamp)}.`,
            }]
        });
    }
}
