import { client } from '@app/client';
import { prisma } from '@app/common/prisma-client';
import { TextChannel } from 'discord.js';

class Service {
    public readonly DEFAULT_XP = 100;
    private readonly LEVEL_MODIFIER = 0.075;

    public convertXpToLevel(xp: number): number {
        // Level = 0.075 * sqrt(xp)
        return Math.floor(this.LEVEL_MODIFIER * Math.sqrt(xp));
    }

    public convertLevelToXp(level: number): number {
        // XP = (Level / 0.075) ^ 2
        return Math.floor(Math.pow(level / this.LEVEL_MODIFIER, 2));
    }

    public getLevel(xp: number): number {
        return this.convertXpToLevel(xp);
    }

    public getLevelProgress(xp: number): number {
        const currentLevelXP = this.convertLevelToXp(this.getLevel(xp));
        const nextLevelXP = this.convertLevelToXp(this.getLevel(xp) + 1);

        const neededXP = nextLevelXP - currentLevelXP;
        const earnedXP = nextLevelXP - xp;

        return 100 - Math.ceil((earnedXP / neededXP) * 100);
    }

    public async grantXp(userId: string, xp: number): Promise<void> {
        const guild = client.guilds.cache.get('927461441051701280');
        if (!guild) return;

        const user = await prisma.guildMember.findUnique({ where: { id: userId } });
        await prisma.guildMember.upsert({
            where: {
                id: userId
            },
            create: {
                id: userId,
                xp,
                guild: {
                    connect: {
                        id: guild.id
                    }
                }
            },
            update: {
                xp: {
                    increment: xp
                }
            }
        });

        // Check if the user has leveled up
        const userLevelBefore = this.getLevel(user?.xp ?? 0);
        const userLevelAfter = this.getLevel((user?.xp ?? 0) + xp);
        if (userLevelBefore !== userLevelAfter) {
            const successChannel = guild.channels.cache.get('1042598577156919376');
            if (!successChannel) return;

            // TODO: Workout what todo about people with XP from the old system
            // // Get all the roles
            // const roles = await guild.roles.fetch();

            // // Get the current level role
            // const currentLevelRole = roles?.find(role => role.name.endsWith(`Level ${userLevelAfter}`));

            // // Add the role to the user
            // if (currentLevelRole) await guild.members.cache.get(userId)?.roles.add(currentLevelRole);

            // Post a message in the success channel
            await (successChannel as TextChannel).send(`Congratulations <@${userId}>, you have leveled up to level ${userLevelAfter}!`);
        }
    }
}

export const levelService = new Service();