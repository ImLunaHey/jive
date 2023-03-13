export type LinkFlairRichtext = {
    a: string;
    u: string;
    e: string;
}

export type MediaEmbed = object;

export type SecureMediaEmbed = object;

export type AuthorFlairRichtext = {
    a: string;
    u: string;
    e: string;
    t: string;
}

export type Gildings = object;

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
    approved_at_utc?: unknown;
    subreddit: string;
    selftext: string;
    user_reports: unknown[];
    saved: boolean;
    mod_reason_title?: unknown;
    gilded: number;
    clicked: boolean;
    title: string;
    link_flair_richtext: LinkFlairRichtext[];
    subreddit_name_prefixed: string;
    hidden: boolean;
    pwls?: unknown;
    link_flair_css_class: string;
    downs: number;
    thumbnail_height: number;
    top_awarded_type?: unknown;
    parent_whitelist_status?: unknown;
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
    secure_media?: unknown;
    is_reddit_media_domain: boolean;
    is_meta: boolean;
    category?: unknown;
    secure_media_embed: SecureMediaEmbed;
    link_flair_text: string;
    can_mod_post: boolean;
    score: number;
    approved_by?: unknown;
    is_created_from_ads_ui: boolean;
    author_premium: boolean;
    thumbnail: string;
    edited: boolean;
    author_flair_css_class?: unknown;
    author_flair_richtext: AuthorFlairRichtext[];
    gildings: Gildings;
    post_hint: string;
    content_categories?: unknown;
    is_self: boolean;
    subreddit_type: string;
    created: number;
    link_flair_type: string;
    wls?: unknown;
    removed_by_category?: unknown;
    banned_by?: boolean;
    author_flair_type: string;
    total_awards_received: number;
    allow_live_comments: boolean;
    selftext_html?: unknown;
    likes?: unknown;
    suggested_sort: string;
    banned_at_utc?: number;
    url_overridden_by_dest: string;
    view_count?: unknown;
    archived: boolean;
    no_follow: boolean;
    spam: boolean;
    is_crosspostable: boolean;
    pinned: boolean;
    over_18: boolean;
    preview: Preview;
    all_awardings: unknown[];
    awarders: unknown[];
    media_only: boolean;
    link_flair_template_id: string;
    can_gild: boolean;
    removed: boolean;
    spoiler: boolean;
    locked: boolean;
    author_flair_text: string;
    treatment_tags: unknown[];
    visited: boolean;
    removed_by?: unknown;
    mod_note?: unknown;
    distinguished: string;
    subreddit_id: string;
    author_is_blocked: boolean;
    mod_reason_by?: unknown;
    num_reports: number;
    removal_reason?: unknown;
    link_flair_background_color: string;
    id: string;
    is_robot_indexable: boolean;
    num_duplicates: number;
    report_reasons: unknown[];
    author: string;
    discussion_type?: unknown;
    num_comments: number;
    send_replies: boolean;
    media?: unknown;
    contest_mode: boolean;
    author_patreon_flair: boolean;
    approved: boolean;
    author_flair_text_color: string;
    permalink: string;
    whitelist_status?: unknown;
    stickied: boolean;
    url: string;
    subreddit_subscribers: number;
    created_utc: number;
    num_crossposts: number;
    mod_reports: unknown[];
    is_video: boolean;
    comment_type?: unknown;
    replies: string;
    collapsed_reason_code: string;
    parent_id: string;
    collapsed?: boolean;
    body: string;
    is_submitter?: boolean;
    body_html: string;
    collapsed_reason?: unknown;
    associated_award?: unknown;
    link_id: string;
    unrepliable_reason?: unknown;
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
    after?: unknown;
    dist?: number;
    modhash: string;
    geo_filter: string;
    children: Child[];
    before?: unknown;
}

export type RedditRandomResponse = {
    kind: string;
    data: Data;
}[]

export type RedditListResponse = {
    kind: string;
    data: Data;
}
