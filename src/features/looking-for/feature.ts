import { globalLogger } from '@app/logger';
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, Colors, CommandInteraction, EmbedBuilder, ModalBuilder, ModalSubmitInteraction, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Discord, Slash, ModalComponent, ButtonComponent, Guard } from 'discordx';
import { RateLimit, TIME_UNIT } from '@discordx/utilities';

@Discord()
export class Feature {
    private embedCache = new Map<string, EmbedBuilder>();
    private logger = globalLogger.scope('LookingFor');

    private channelId = '1083557897813901404';

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

        // Check if the user already has a post
        const channel = interaction.guild?.channels.cache.get(this.channelId);
        if (!channel) return;
        if (channel.type !== ChannelType.GuildText) return;

        // Fetch the last 100 messages
        const messages = await channel.messages.fetch({ limit: 100 });

        // Find the user's message
        const message = messages.find((m) => m.components.find(component => JSON.stringify(component.toJSON()).includes(interaction.user.id)));
        if (message) {
            // Reply with a confirmation message
            await interaction.reply({
                ephemeral: true,
                content: `You already have a post! ${message.url}`,
            });
            return;
        }

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
                    .setMinLength(1)
                    .setMaxLength(3)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('yes/no'),
            ),
        ]);

        // Show the modal to the user
        await interaction.showModal(modal);
    }

    @ModalComponent({
        id: 'looking-for-modal',
    })
    async lookingForModal(interaction: ModalSubmitInteraction) {
        if (!interaction.guild) return;

        // Defer the reply
        if (!interaction.deferred) await interaction.deferReply({ ephemeral: true });

        const channel = interaction.guild.channels.cache.get(this.channelId);
        if (!channel) return;

        const description = interaction.fields.getTextInputValue('description');
        const anon = interaction.fields.getTextInputValue('anon').toLowerCase().trim() === 'yes';

        const embed = new EmbedBuilder()
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
        await interaction.editReply({
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
        if (!interaction.deferred) await interaction.deferUpdate();

        // Remove the embed from the cache
        this.embedCache.delete(interaction.user.id);

        // Reply with a confirmation message
        await interaction.editReply({
            content: 'Your message has been deleted!',
            embeds: [],
            components: [],
        });
    }

    @ButtonComponent({
        id: 'looking-for-confirm',
    })
    async lookingForButton(interaction: ModalSubmitInteraction) {
        if (!interaction.guild) return;

        // Defer the reply
        if (!interaction.deferred) await interaction.deferUpdate();

        const channel = interaction.guild.channels.cache.get(this.channelId);
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
                        new ButtonBuilder()
                            .setCustomId(`looking-for-delete [${interaction.user.id}]`)
                            .setLabel('Delete')
                            .setStyle(ButtonStyle.Danger),
                    ),
            ]
        });

        // Reply with a confirmation message
        await interaction.editReply({
            content: 'Your message has been sent!',
            embeds: [],
            components: [],
        });
    }

    @ButtonComponent({
        id: /^looking-for-interested-in \[(\d{18})\]$/
    })
    @Guard(
        RateLimit(TIME_UNIT.seconds, 60, {
            ephemeral: true,
            message: 'You are doing this too fast! Please wait 60 seconds before trying again.',
            rateValue: 1,
        })
    )
    async lookingForInterested(interaction: ButtonInteraction) {
        if (!interaction.guild) return;

        // Defer the reply
        if (!interaction.deferred) await interaction.deferUpdate();

        const channel = interaction.guild.channels.cache.get(this.channelId);
        if (!channel) return;
        if (channel.type !== ChannelType.GuildText) return;

        // Get the ID from the button ID
        const userId = interaction.customId.match(/^looking-for-interested-in \[(\d{18})\]$/)?.[1];
        if (!userId) return;

        // Get the user
        const user = await interaction.client.users.fetch(userId);
        if (!user) return;

        // Check if they're the original author
        if (user.id === interaction.user.id) {
            await interaction.followUp({
                ephemeral: true,
                content: 'You can\'t be interested in your own post!',
            });
            return;
        }

        // Reply with a confirmation message
        await interaction.followUp({
            ephemeral: true,
            content: `We've sent them a message for you!`,
        });

        // DM the user
        await user.send({
            content: `<@${interaction.user.id}> is interested in your post!`,
        });
    }

    @ButtonComponent({
        id: /^looking-for-delete \[(\d{18})\]$/
    })
    async lookingForDelete(interaction: ButtonInteraction) {
        if (!interaction.guild) return;

        // Defer the reply
        if (!interaction.deferred) await interaction.deferUpdate();

        const channel = interaction.guild.channels.cache.get(this.channelId);
        if (!channel) return;
        if (channel.type !== ChannelType.GuildText) return;

        // Get the ID from the button ID
        const userId = interaction.customId.match(/^looking-for-delete \[(\d{18})\]$/)?.[1];
        if (!userId) return;

        // Get the user
        const user = await interaction.client.users.fetch(userId);
        if (!user) return;

        // Check if they're the original author
        if (user.id !== interaction.user.id) {
            await interaction.followUp({
                ephemeral: true,
                content: 'You can\'t delete someone else\'s post!',
            });
            return;
        }

        // Delete the message
        const message = await channel.messages.fetch(interaction.message.id);
        if (message) await message.delete();

        // Reply with a confirmation message
        await interaction.followUp({
            ephemeral: true,
            content: `We've deleted your post!`,
        });
    }
}
