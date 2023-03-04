import { logger } from '@app/logger';
import { GuildMember } from 'discord.js';
import { ArgsOf, Discord, On } from 'discordx';

@Discord()
export class Feature {
    constructor() {
        logger.success('AutoRoles feature initialized');
    }

    @On({ event: 'guildMemberUpdate' })
    async guildMemberUpdate([oldMember, newMember]: ArgsOf<'guildMemberUpdate'>) {
        // Check if the member has agreed to the rules
        if (oldMember.pending && !newMember.pending) {
            // Give the member their roles
            this.giveRoles(newMember);
        }
    }

    giveRoles(member: GuildMember) {
        // Give the member their roles
        // member.roles.add('927461441051701283');
    }
}