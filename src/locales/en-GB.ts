export default {
    'bot.name': 'Jive',
    'verify.menus.verifyMember': 'Verify member',
    'verify.messages.loading': 'Verifying <@{memberId}> please wait...',
    'verify.messages.failed.title': 'Failed to verify member',
    'verify.messages.failed.defaultProfileImage': 'The member has a default profile image.',
    'verify.messages.failed.missingRoles': 'The member is missing roles.',
    'verify.messages.success.configuringRoles': 'Verified <@{memberId}>, adding/removing roles...',
    'verify.messages.success.verified': 'Verified <@{memberId}>',
    'debug.messages.ping.title': 'Pong!',
    'debug.messages.ping.loading': 'Checking the ping...',
    'debug.messages.ping.latency': 'Message latency is {messageLatency}ms. API Latency is {apiLatency}ms',
} as const;
