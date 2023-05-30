import type { CommandInteraction } from 'discord.js';
import { expect, jest } from '@jest/globals';

describe('Debug', () => {
    it('should return pong', async () => {
        const DebugFeature = await import('@app/features/debug/feature').then(package_ => package_.Feature);
        const edit = jest.fn();
        const timestamp = Date.now();
        const deferReply = jest.fn();
        const editReply = jest.fn(() => ({
            edit,
            createdTimestamp: timestamp,
        }));
        const interaction = {
            createdTimestamp: timestamp,
            deferReply,
            editReply,
            user: {
                id: '1234567890',
            },
            client: {
                ws: {
                    ping: 0,
                },
            },
        } as unknown as CommandInteraction;
        const feature = new DebugFeature();
        await feature.ping(interaction);

        // Check if the interaction was deferred
        expect(deferReply).toHaveBeenCalled();

        // Check if the interaction was edited
        expect(editReply).toHaveBeenCalled();

        // Check if the message was edited
        expect(edit).toHaveBeenCalled();
        expect(edit).toHaveBeenCalledWith({
            embeds: [{
                title: 'Pong!',
                description: 'Message latency is 0ms. API Latency is 0ms',
            }],
        });
    });
});


// @Slash({
//     name: 'ping',
//     description: 'Pong!',
// })
// async ping(
//     interaction: CommandInteraction
// ) {
//     // Show the bot thinking
//     await interaction.deferReply({ ephemeral: false });

//     const message = await interaction.editReply({
//         embeds: [{
//             title: 'Pong!',
//             description: 'Checking the ping...'
//         }]
//     });

//     await message.edit({
//         embeds: [{
//             title: 'Pong!',
//             description: `Message latency is ${message.createdTimestamp - interaction.createdTimestamp}ms. API Latency is ${Math.round(interaction.client.ws.ping)}ms`
//         }]
//     });
// }