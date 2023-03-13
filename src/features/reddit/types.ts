export type LinkFlairRichtext = {
    a: string;
    u: string;
    e: string;
}

export type MediaEmbed = {
}

export type SecureMediaEmbed = {
}

export type AuthorFlairRichtext = {
    a: string;
    u: string;
    e: string;
    t: string;
}

export type Gildings = {
}

export type Source = {
    url: string;
    width: number;
    height: number;
}

export type Resolution = {
    url: string;
    width: number;
    height: number;
}

export type Source2 = {
    url: string;
    width: number;
    height: number;
}

export type Resolution2 = {
    url: string;
    width: number;
    height: number;
}

export type Obfuscated = {
    source: Source2;
    resolutions: Resolution2[];
}

export type Source3 = {
    url: string;
    width: number;
    height: number;
}

export type Resolution3 = {
    url: string;
    width: number;
    height: number;
}

export type Gif = {
    source: Source3;
    resolutions: Resolution3[];
}

export type Source4 = {
    url: string;
    width: number;
    height: number;
}

export type Resolution4 = {
    url: string;
    width: number;
    height: number;
}

export type Mp4 = {
    source: Source4;
    resolutions: Resolution4[];
}

export type Source5 = {
    url: string;
    width: number;
    height: number;
}

export type Resolution5 = {
    url: string;
    width: number;
    height: number;
}

export type Nsfw = {
    source: Source5;
    resolutions: Resolution5[];
}

export type Variants = {
    obfuscated: Obfuscated;
    gif: Gif;
    mp4: Mp4;
    nsfw: Nsfw;
}

export type Image = {
    source: Source;
    resolutions: Resolution[];
    variants: Variants;
    id: string;
}

export type Preview = {
    images: Image[];
    enabled: boolean;
}

export type T3 = {
    author_flair_background_color: string;
    approved_at_utc?: any;
    subreddit: string;
    selftext: string;
    user_reports: any[];
    saved: boolean;
    mod_reason_title?: any;
    gilded: number;
    clicked: boolean;
    title: string;
    link_flair_richtext: LinkFlairRichtext[];
    subreddit_name_prefixed: string;
    hidden: boolean;
    pwls?: any;
    link_flair_css_class: string;
    downs: number;
    thumbnail_height: number;
    top_awarded_type?: any;
    parent_whitelist_status?: any;
    hide_score: boolean;
    name: string;
    quarantine: boolean;
    link_flair_text_color: string;
    upvote_ratio: number;
    ignore_reports: boolean;
    ups: number;
    domain: string;
    media_embed: MediaEmbed;
    thumbnail_width: number;
    author_flair_template_id: string;
    is_original_content: boolean;
    author_fullname: string;
    secure_media?: any;
    is_reddit_media_domain: boolean;
    is_meta: boolean;
    category?: any;
    secure_media_embed: SecureMediaEmbed;
    link_flair_text: string;
    can_mod_post: boolean;
    score: number;
    approved_by?: any;
    is_created_from_ads_ui: boolean;
    author_premium: boolean;
    thumbnail: string;
    edited: boolean;
    author_flair_css_class?: any;
    author_flair_richtext: AuthorFlairRichtext[];
    gildings: Gildings;
    post_hint: string;
    content_categories?: any;
    is_self: boolean;
    subreddit_type: string;
    created: number;
    link_flair_type: string;
    wls?: any;
    removed_by_category?: any;
    banned_by?: boolean;
    author_flair_type: string;
    total_awards_received: number;
    allow_live_comments: boolean;
    selftext_html?: any;
    likes?: any;
    suggested_sort: string;
    banned_at_utc?: number;
    url_overridden_by_dest: string;
    view_count?: any;
    archived: boolean;
    no_follow: boolean;
    spam: boolean;
    is_crosspostable: boolean;
    pinned: boolean;
    over_18: boolean;
    preview: Preview;
    all_awardings: any[];
    awarders: any[];
    media_only: boolean;
    link_flair_template_id: string;
    can_gild: boolean;
    removed: boolean;
    spoiler: boolean;
    locked: boolean;
    author_flair_text: string;
    treatment_tags: any[];
    visited: boolean;
    removed_by?: any;
    mod_note?: any;
    distinguished: string;
    subreddit_id: string;
    author_is_blocked: boolean;
    mod_reason_by?: any;
    num_reports: number;
    removal_reason?: any;
    link_flair_background_color: string;
    id: string;
    is_robot_indexable: boolean;
    num_duplicates: number;
    report_reasons: any[];
    author: string;
    discussion_type?: any;
    num_comments: number;
    send_replies: boolean;
    media?: any;
    contest_mode: boolean;
    author_patreon_flair: boolean;
    approved: boolean;
    author_flair_text_color: string;
    permalink: string;
    whitelist_status?: any;
    stickied: boolean;
    url: string;
    subreddit_subscribers: number;
    created_utc: number;
    num_crossposts: number;
    mod_reports: any[];
    is_video: boolean;
    comment_type?: any;
    replies: string;
    collapsed_reason_code: string;
    parent_id: string;
    collapsed?: boolean;
    body: string;
    is_submitter?: boolean;
    body_html: string;
    collapsed_reason?: any;
    associated_award?: any;
    link_id: string;
    unrepliable_reason?: any;
    score_hidden?: boolean;
    controversiality?: number;
    depth?: number;
    collapsed_because_crowd_control?: boolean;
    ban_note: string;
}

export type Child = {
    kind: 't3' | 't5';
    data: T3;
}

export type Data = {
    after?: any;
    dist?: number;
    modhash: string;
    geo_filter: string;
    children: Child[];
    before?: any;
}

export type RedditRandomResponse = {
    kind: string;
    data: Data;
}[]

export type RedditListResponse = {
    kind: string;
    data: Data;
}
