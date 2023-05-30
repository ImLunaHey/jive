import { ChannelType } from 'discord.js';

export const channelTypeToName = (type: ChannelType) => (({
    [ChannelType.GuildText]: 'Text', 
    [ChannelType.DM]: 'DM', 
    [ChannelType.GuildVoice]: 'Voice', 
    [ChannelType.GroupDM]: 'Group DM', 
    [ChannelType.GuildCategory]: 'Category', 
    [ChannelType.GuildAnnouncement]: 'Announcement', 
    [ChannelType.AnnouncementThread]: 'Announcement Thread', 
    [ChannelType.PublicThread]: 'Public Thread', 
    [ChannelType.PrivateThread]: 'Private Thread', 
    [ChannelType.GuildStageVoice]: 'Stage', 
    [ChannelType.GuildDirectory]: 'Directory', 
    [ChannelType.GuildForum]: 'Forum',
} as const)[type] ?? 'Unknown' as const);
