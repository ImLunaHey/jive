import { randomUUID } from 'node:crypto';
import { database } from '@app/common/database';
import { Logger } from '@app/logger';
import { ApplicationCommandOptionType, CommandInteraction } from 'discord.js';
import { Discord, Slash, SlashGroup, SlashOption } from 'discordx';

@Discord()
// Create a group
@SlashGroup({ description: 'Manage FAQs', name: 'faq' })
// Assign all inherit slashes to the subgroup
@SlashGroup('faq')
export class Feature {
    private logger = new Logger({ service: 'FAQ' });

    constructor() {
        this.logger.info('Initialised');
    }

    @Slash({ description: 'get' })
    async get(
        @SlashOption({
            name: 'question',
            description: 'Which question to post',
            required: true,
            type: ApplicationCommandOptionType.String,
            async autocomplete(interaction) {
                if (!interaction.guild?.id) {
                    await interaction.respond([]);
                    return;
                }

                const selected = interaction.options.getString('question')?.toLowerCase();

                const faqs = await database
                    .selectFrom('faqs')
                    .select('id as value')
                    .select('question as name')
                    .$if(selected !== undefined, qb => qb.where('question', 'like', selected as string))
                    .where('guildId', '=', interaction.guild.id)
                    .execute();

                await interaction.respond(faqs);
            },
        }) faqId: string,
        interaction: CommandInteraction,
    ) {
        if (!interaction.guild?.id) return;

        const faq = await database
            .selectFrom('faqs')
            .select('question')
            .select('answer')
            .where('id', '=', faqId)
            .executeTakeFirst();

        if (!faq) return;

        // Reply to user
        await interaction.reply({
            embeds: [{
                title: faq.question,
                description: faq.answer,
            }],
        });
    }

    @Slash({ description: 'add' })
    async add(
        @SlashOption({
            name: 'question',
            description: 'The question',
            required: true,
            type: ApplicationCommandOptionType.String,
        }) question: string,
        @SlashOption({
            name: 'question',
            description: 'The answer',
            required: true,
            type: ApplicationCommandOptionType.String,
        }) answer: string,
        interaction: CommandInteraction,
    ) {
        if (!interaction.guild?.id) return;

        await database
            .insertInto('faqs')
            .values({
                id: randomUUID(),
                guildId: interaction.guild.id,
                answer,
                question,
            })
            .execute();

        // Reply to user
        await interaction.reply({
            embeds: [{
                title: question,
                description: answer,
            }],
        });
    }
}
