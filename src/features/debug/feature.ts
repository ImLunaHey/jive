import { inspect } from 'util';
import { client } from '@app/client';
import { prisma } from '@app/common/prisma-client';
import { env } from '@app/env';
import { globalLogger } from '@app/logger';
import { ActionRowBuilder, ChannelType, Colors, CommandInteraction, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { ArgsOf, Discord, Guard, Guild, On, Slash } from 'discordx';

@Discord()
export class Feature {
    private logger = globalLogger.scope('Debug');

    constructor() {
        this.logger.success('Feature initialized');

        // Get count of guilds
        void prisma.guild.count().then((count) => {
            this.logger.info('Bot is in %d guilds', count);
        });
    }

    @On({ event: 'ready' })
    async ready(): Promise<void> {
        // Get the guild
        const guild = client.guilds.cache.get('927461441051701280');
        if (!guild) return;

        // Get the channel
        const channel = guild.channels.cache.get('1081533925337350166');
        if (!channel) return;

        // Check if the channel is a text channel
        if (channel.type !== ChannelType.GuildText) return;

        // Get the status
        const status = env.MAINTENCE_MODE ? 'in maintence mode' : 'online';

        // Create the embed
        const embed = new EmbedBuilder({
            title: 'Bot status',
            description: `The bot is ${status} and ready to go!`,
            // Orange or green
            color: env.MAINTENCE_MODE ? Colors.Orange : Colors.Green,
        });

        // Fetch the messages
        const messages = await channel.messages.fetch();

        // Check if the embed has already been sent
        const message = messages.find((message) => message.embeds.some((embed) => embed.title === 'Bot status'));
        if (message) {
            // Edit the embed
            await message.edit({
                embeds: [embed]
            });
            return;
        }

        // Send the embed to the channel
        await channel.send({
            embeds: [embed]
        });
    }

    @Slash({
        name: 'ping',
        description: 'Pong!',
    })
    async ping(
        interaction: CommandInteraction
    ) {
        // Show the bot thinking
        await interaction.deferReply({ ephemeral: false });

        const message = await interaction.editReply({
            embeds: [{
                title: 'Pong!',
                description: 'Checking the ping...'
            }]
        });

        await message.edit({
            embeds: [{
                title: 'Pong!',
                description: `Message latency is ${message.createdTimestamp - interaction.createdTimestamp}ms. API Latency is ${Math.round(interaction.client.ws.ping)}ms`
            }]
        });
    }

    @Slash({
        name: 'eval',
        description: 'Evaluate code',
    })
    @Guard(async (interaction, _client, next) => {
        if (interaction.user.id === env.OWNER_ID) await next();
    })
    @Guild(env.OWNER_GUILD_ID)
    async eval(
        interaction: CommandInteraction,
    ) {
        // Show the bot thinking
        await interaction.deferReply({ ephemeral: true });

        // Create the modal
        const modal = new ModalBuilder()
            .setCustomId('eval-modal')
            .setTitle('Eval');

        // Add inputs to the modal
        modal.addComponents([
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('code')
                    .setLabel('Code to eval')
                    .setValue('')
                    .setStyle(TextInputStyle.Paragraph)
            ),
        ]);

        // Show the modal to the user
        await interaction.showModal(modal);
    }

    @On({ event: 'interactionCreate' })
    async onInteractionCreate([interaction]: ArgsOf<'interactionCreate'>) {
        if (!interaction.isModalSubmit()) return;

        if (interaction.customId === 'eval-modal') {
            try {
                // Get the code
                const code = interaction.fields.getTextInputValue('code');

                // Evaluate our input
                const evaled = eval(code);

                // Cleanup result
                let result = evaled;
                if (result && result.constructor.name == "Promise") result = await result;
                if (typeof result !== "string") result = inspect(result, { depth: 1 });
                result = result.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
                result = result.replaceAll(client.token, "[REDACTED]");

                // Send the result
                await interaction.editReply(`\`\`\`js\n${result}\n\`\`\``);
            } catch (error: unknown) {
                // Send the error
                await interaction.editReply(`\`ERROR\` \`\`\`xl\n${error}\n\`\`\``);
            }

            return;
        }
    }
}
