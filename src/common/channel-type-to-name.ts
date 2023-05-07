import { ChannelType } from 'discord.js';

export const channelTypeToName = (type: ChannelType) => {
    switch (type) {
        case ChannelType.GuildText:
            return 'Text';
        case ChannelType.DM:
            return 'DM';
        case ChannelType.GuildVoice:
            return 'Voice';
        case ChannelType.GroupDM:
            return 'Group DM';
        case ChannelType.GuildCategory:
            return 'Category';
        case ChannelType.GuildAnnouncement:
            return 'Announcement';
        case ChannelType.AnnouncementThread:
            return 'Announcement Thread';
        case ChannelType.PublicThread:
            return 'Public Thread';
        case ChannelType.PrivateThread:
            return 'Private Thread';
        case ChannelType.GuildStageVoice:
            return 'Stage';
        case ChannelType.GuildDirectory:
            return 'Directory';
        case ChannelType.GuildForum:
            return 'Forum';
        default:
            return 'Unknown';
    }
};
