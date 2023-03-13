import { inspect } from 'util';
import { client } from '@app/client';
import { prisma } from '@app/common/prisma-client';
import { env } from '@app/env';
import { globalLogger } from '@app/logger';
import { ActionRowBuilder, AttachmentBuilder, ChannelType, Colors, CommandInteraction, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { type ArgsOf, Discord, Guard, Guild, On, Slash } from 'discordx';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { Canvas } from '@napi-rs/canvas';

const applyText = (canvas: Canvas, text: string) => {
    const context = canvas.getContext('2d');
    let fontSize = 70;

    do {
        context.font = `${fontSize -= 10}px sans-serif`;
    } while (context.measureText(text).width > canvas.width - 300);

    return context.font;
};

const isPromiseLike = <T>(element: unknown): element is Promise<T> => {
    if (element === null) return false;
    if (typeof element === 'object' && 'then' in element) return true;
    return false;
};

const replaceAll = (string: string, search: string, replace: string) => {
    // If a regex pattern
    if (Object.prototype.toString.call(search) === '[object RegExp]') {
        return string.replace(search, replace);
    }

    // If a string
    return string.replace(new RegExp(search, 'g'), replace);
};

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
        name: 'reload',
        description: 'Reload the bot',
    })
    async reload(interaction: CommandInteraction) {
        // Check if the user is the owner
        if (interaction.user.id !== env.OWNER_ID) {
            await interaction.reply({
                content: 'You are not the owner of the bot.',
                ephemeral: true,
            });
            return;
        }

        // Reply with a confirmation message
        await interaction.reply({
            content: 'Reloading the bot...',
            ephemeral: true,
        });

        // Reload the bot
        process.exit(0);
    }

    @Slash({
        name: 'test',
        description: 'Test the bot',
    })
    async test(interaction: CommandInteraction) {
        const userUsername = interaction.member?.user.username;
        if (!userUsername) return;

        const canvas = createCanvas(700, 250);
        const context = canvas.getContext('2d');

        context.fillStyle = 'black';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.fillStyle = 'white';
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            context.fillRect(x, y, 2, 2);
        }

        context.strokeStyle = '#0099ff';
        context.strokeRect(0, 0, canvas.width, canvas.height);

        context.font = '28px sans-serif';
        context.fillStyle = '#ffffff';
        context.fillText('Profile', canvas.width / 2.5, canvas.height / 3.5);

        context.font = applyText(canvas, `${userUsername}!`);
        context.fillStyle = '#ffffff';
        context.fillText(`${userUsername}!`, canvas.width / 2.5, canvas.height / 1.8);

        context.beginPath();
        context.arc(125, 125, 100, 0, Math.PI * 2, true);
        context.closePath();
        context.clip();

        const buffer = await fetch(interaction.user.displayAvatarURL({ extension: 'jpg' })).then(response => response.arrayBuffer());
        const avatar = await loadImage(buffer);

        context.drawImage(avatar, 25, 25, 200, 200);

        // Create the attachment
        const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile-image.png' });

        // Send the attachment
        await interaction.reply({ files: [attachment] });
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
    @Guard(async (interaction: CommandInteraction, _client, next) => {
        if (interaction.user?.id === env.OWNER_ID) await next();
    })
    @Guild(env.OWNER_GUILD_ID)
    async eval(
        interaction: CommandInteraction,
    ) {
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
                const evaled = eval(`(async () => { ${code} })()`) as unknown;

                // Cleanup result
                let result = evaled;
                if (isPromiseLike(result)) result = await result;
                if (typeof result !== 'string') result = inspect(result, { depth: 1 });

                result = (result as string).replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203));
                result = replaceAll(result as string, env.BOT_TOKEN, '[REDACTED]');

                // Check if the result is too long
                if ((result as string).length > 2000) {
                    result = (result as string).slice(0, 2000);
                    result += '...';
                }

                // If we already replied and the result is undefined or null, we don't need to send a message
                if ((interaction.deferred || interaction.replied) && !result) return;

                // Send the result
                await interaction[(interaction.deferred || interaction.replied) ? 'followUp' : 'reply'](`\`\`\`js\n${(result as string)}\n\`\`\``);
            } catch (error: unknown) {
                await interaction[(interaction.deferred || interaction.replied) ? 'followUp' : 'reply'](`\`ERROR\` \`\`\`xl\n${String(error)}\n\`\`\``);
            }

            return;
        }
    }
}
