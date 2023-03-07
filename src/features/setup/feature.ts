import { client } from '@app/client';
import { globalLogger } from '@app/logger';
import { CacheType, ChatInputCommandInteraction, CommandInteraction, EmbedBuilder } from 'discord.js';
import { PagesBuilder } from 'discord.js-pages';
import { Discord, Slash } from 'discordx';

@Discord()
export class Feature {
    private logger = globalLogger.scope('Setup');

    constructor() {
        this.logger.success('Feature initialized');

    }

    @Slash({
        name: 'setup',
        description: 'Setup the bot',
    })
    async setup(
        interaction: CommandInteraction
    ) {
        // Show the bot thinking
        await interaction.deferReply({ ephemeral: false });

        // This can only be used in a guild
        if (!interaction.guild?.id) return;
        const guild = client.guilds.cache.get(interaction.guild?.id);
        if (!guild) return;

        if (!interaction.isCommand()) return;

        // Create the pages
        new PagesBuilder(interaction as ChatInputCommandInteraction<CacheType>)
            .setTitle('Setup')
            .setPages([
                new EmbedBuilder()
                    .setDescription('First page'),
                new EmbedBuilder()
                    .setDescription('Second page')
            ])
            .addFields([
                {
                    name: 'Global field',
                    value: 'discord.js-pages',
                    inline: true
                }
            ])
            .setColor('Green')
            .build();
    }
}
