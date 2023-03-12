import { globalLogger } from '@app/logger';
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, Colors, CommandInteraction, EmbedBuilder, ModalBuilder, ModalSubmitInteraction, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Discord, Slash, ModalComponent, ButtonComponent } from 'discordx';

@Discord()
export class Feature {
    private embedCache = new Map<string, EmbedBuilder>();
    private logger = globalLogger.scope('LookingFor');

    constructor() {
        this.logger.success('Feature initialized');
    }

    @Slash({
        name: 'looking-for',
        description: 'Looking for someone?',
    })
    async lookingFor(
        interaction: CommandInteraction,
    ) {
        // Create the modal
        const modal = new ModalBuilder()
            .setCustomId('looking-for-modal')
            .setTitle('Looking for someone?');

        // Add inputs to the modal
        modal.addComponents([
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('description')
                    .setLabel('What are you looking for?')
                    .setValue('')
                    .setStyle(TextInputStyle.Paragraph),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('anon')
                    .setLabel('Should this be posted anonymously?')
                    .setValue('yes')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('yes/no'),
            ),
        ]);

        // Show the modal to the user
        await interaction.showModal(modal);
    }

    @ModalComponent({
        id: 'looking-for',
    })
    async lookingForModal(interaction: ModalSubmitInteraction) {
        if (!interaction.guild) return;

        // Defer the reply
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.guild.channels.cache.get('1084138350107185262');
        if (!channel) return;

        const description = interaction.fields.getTextInputValue('description');
        const anon = interaction.fields.getTextInputValue('anon').toLowerCase().trim() === 'yes';

        const embed = new EmbedBuilder()
            .setTitle('Looking for someone?')
            .setDescription(description)
            .setColor(Colors.Blue);

        if (anon) {
            embed.setAuthor({
                name: 'Anonymous',
                iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png',
            });
        } else {
            embed.setAuthor({
                name: interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL(),
            });
        }

        // Cache the embed for later
        this.embedCache.set(interaction.user.id, embed);

        // Reply with the embed so the user can confirm
        await interaction.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('looking-for-confirm')
                            .setLabel('Confirm')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('looking-for-cancel')
                            .setLabel('Cancel')
                            .setStyle(ButtonStyle.Danger),
                    ),
            ],
        });
    }

    @ButtonComponent({
        id: 'looking-for-cancel',
    })
    async lookingForCancel(interaction: ModalSubmitInteraction) {
        if (!interaction.guild) return;

        // Defer the reply
        await interaction.deferReply({ ephemeral: true });

        // Remove the embed from the cache
        this.embedCache.delete(interaction.user.id);

        // Reply with a confirmation message
        await interaction.reply({
            content: 'Your message has been deleted!',
        });
    }

    @ButtonComponent({
        id: 'looking-for-confirm',
    })
    async lookingForButton(interaction: ModalSubmitInteraction) {
        if (!interaction.guild) return;

        // Defer the reply
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.guild.channels.cache.get('1084138350107185262');
        if (!channel) return;
        if (channel.type !== ChannelType.GuildText) return;

        const embed = this.embedCache.get(interaction.user.id);
        if (!embed) return;

        // Remove the embed from the cache
        this.embedCache.delete(interaction.user.id);

        // Send the embed
        await channel.send({
            embeds: [embed],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`looking-for-interested-in [${interaction.user.id}]`)
                            .setLabel('I\'m interested')
                            .setStyle(ButtonStyle.Primary),
                    ),
            ]
        });

        // Reply with a confirmation message
        await interaction.reply({
            content: 'Your message has been sent!',
        });
    }

    @ButtonComponent({
        id: /^looking-for-interested-in \[(\d{18})\]$/
    })
    async lookingForInterested(interaction: ButtonInteraction) {
        if (!interaction.guild) return;

        // Defer the reply
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.guild.channels.cache.get('1084138350107185262');
        if (!channel) return;
        if (channel.type !== ChannelType.GuildText) return;

        // Get the ID from the button ID
        const userId = interaction.customId.match(/^looking-for-interested-in \[(\d{18})\]$/)?.[1];
        if (!userId) return;

        // Get the user
        const user = await interaction.client.users.fetch(userId);
        if (!user) return;

        // Reply with a confirmation message
        await interaction.reply({
            content: `We've sent <@${user.id}> a message for you!`,
        });

        // DM the user
        await user.send({
            content: `Someone is interested in your post! <@${interaction.user.id}> is interested in your post!`,
        });
    }
}
