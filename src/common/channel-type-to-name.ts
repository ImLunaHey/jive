import { ChannelType } from 'discord.js';

export const channelTypeToName = (type: ChannelType) => {
    switch (type) {
        case ChannelType.GuildText:
            return 'Guild Text';
        case ChannelType.DM:
            return 'DM';
        case ChannelType.GuildVoice:
            return 'Guild Voice';
        case ChannelType.GroupDM:
            return 'Group DM';
        case ChannelType.GuildCategory:
            return 'Guild Category';
        case ChannelType.GuildAnnouncement:
            return 'Guild Announcement';
        case ChannelType.AnnouncementThread:
            return 'Announcement Thread';
        case ChannelType.PublicThread:
            return 'Public Thread';
        case ChannelType.PrivateThread:
            return 'Private Thread';
        case ChannelType.GuildStageVoice:
            return 'Guild Stage Voice';
        case ChannelType.GuildDirectory:
            return 'Guild Directory';
        case ChannelType.GuildForum:
            return 'Guild Forum';
        default:
            return 'Unknown';
    }
};
