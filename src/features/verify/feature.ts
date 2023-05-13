import { ContextMenu, Discord, Guild } from 'discordx';
import { globalLogger } from '@app/logger';
import type { TextChannel } from 'discord.js';
import { Colors } from 'discord.js';
import { ApplicationCommandType, MessageContextMenuCommandInteraction } from 'discord.js';
import { outdent } from 'outdent';

@Discord()
@Guild('927461441051701280')
export class Feature {
    private logger = globalLogger.child({ service: 'Verify' });

    constructor() {
        this.logger.info('Initialised');
    }

    @ContextMenu({
        name: 'Verify member',
        defaultMemberPermissions: 'Administrator',
        type: ApplicationCommandType.User,
    })
    async verify(interaction: MessageContextMenuCommandInteraction) {
        // Show bot thinking
        if (!interaction.deferred) await interaction.deferReply({ ephemeral: true, });

        // Get the member who we need to verify
        const member = await interaction.guild?.members.fetch(interaction.targetId);
        if (!member) return;

        // Tell staff we're verifying them
        await interaction.editReply({
            embeds: [{
                description: `Verifying <@${member.id}> please wait...`,
                color: Colors.Blue,
            }]
        });

        // Check if they have a default profile image
        if (member.displayAvatarURL() === `https://cdn.discordapp.com/embed/avatars/${Number(member.user.discriminator) % 5}.png`) {
            await interaction.editReply({
                embeds: [{
                    title: 'Failed to verify member',
                    description: 'The member has a default profile image.',
                    color: Colors.Red,
                }],
            })
            return;
        }

        // Check if they're have the needed roles
        const hasNeededRoles = member.roles.cache.has('957080658461749378');
        if (!hasNeededRoles) {
            await interaction.editReply({
                embeds: [{
                    title: 'Failed to verify member',
                    description: 'The member is missing roles.',
                    color: Colors.Red,
                }],
            })
            return;
        }

        // Tell staff they passed all the checks
        await interaction.editReply({
            embeds: [{
                description: `Verified <@${member.id}>, adding/removing roles...`,
                color: Colors.Blue,
            }]
        });

        // Add roles
        await member.roles.add('965589467832401950');

        // Remove roles
        await member.roles.remove('957080658461749378');

        // Get verified channel
        const verifiedChannel = (interaction.guild?.channels.cache.get('965594171438157834') ?? await interaction.guild?.channels.fetch('965594171438157834')) as TextChannel | undefined;
        if (!verifiedChannel) return;

        // Tag member in verified channel
        await verifiedChannel.send({
            content: `<@${member.id}> you're now verified, please check your DMs for more info!`,
        });

        // Send the member the DM with follow up info
        await member.send({
            embeds: [{
                title: 'Welcome to the real Luna\'s Lobby! Glad you made it! 💖',
                description: outdent`
                    Since you're Verified now, you can assign yourself <#965570721906556948> . These will grant access to certain threads that would normally stay hidden.
    
                    Take a minute to familiarize yourself with the various Categories (found to the left of this chat) :
                    
                    **Important** - Important stuff ( <#927519079647047690> ) goes here!
                    **Lunas Stuff** - Check out Luna's <#1022858357977137152> 
                    **Promotions** - <#927469431406354473> for sellers to share their links (OF, Fansly, etc), <#969406834416951346> for non-SW content (Twitch, Insta, etc)
                    **Voice/Video Chat** - come chat with us in VC (SFW)
                    **Social** - General chat and server info <#965594171438157834> for verified members. Use the <#928858940324868116> to ask individual members if they'd like to DM with you, if their roles allow it! You can also post a SFW pic of you in <#960192500302245968> !
                    **Community** - Places to share various things in your life - your <#928762306274418739> , any <#967645107849408572> you want to yell from the rooftops, or even a <#928762677201866812> to get things off your chest! If you want, you can introduce yourself in <#927519746553962549> 
                    **Interests** - More specialized interests - really into <#934673812774088765> ? <#958633824642793522> ? <#934357660701167646> ? Chat about it here! Show us what you had for dinner in <#960063704899149844> , and share your taste in <#928762347793813564> 
                    **Homes** - this is where members of Level 20 and up can make their own <#978169097290395688> - a thread they control the content in (following server <#927461801355018260> , of course!)
                    **NSFW** - Any and all NSFW stuff goes here -  <#927464169802956844> for general chatting, <#960468158655909948> and <#928475672660299796> and <#978162866383372331> OH MY! 
                    
                    Please check the pins of the threads you are in for important information, and please feel free to ask if you have questions! Have fun and hope to see you around! 💖
                `,
            }],
        });

        // Tell staff it was successful
        await interaction.editReply({
            embeds: [{
                description: `Verified <@${member.id}>`,
                color: Colors.Green,
            }]
        });
    }
}
