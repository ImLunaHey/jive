# Commands
AuditLog -> Vars -> auditLogChannelId, ban, kick, mute, unmute, warn
                 -> ignoredChannelIds, messageDeleteMessage
         -> Method -> On action if this is enabled, this is not an ignored channel and this action is enabled, send a message to the auditLogChannelId 

Welcome -> Vars -> joinMessage, joinChannelId, joinDm
                -> addRoles, removeRoles, waitUntilGate
        -> Method -> On If joinChannelId send to channel, use joinMessage
                     If joinDm send to DM, use joinMessage
 
                     If waitUntilGate is true don't do anything until pending goes from false -> true
                     Add any roles listed
                     Remove any roles listed

AutoDelete -> Vars -> triggerChannelId, inverted, triggerMessage
                   -> triggerTimeout, replyMessage, replyTimeout, replyDeleteTimeout
           -> Method -> On messageCreate if is in an autodelete triggerChannelId continue 
                        If inverted = false and triggerMessage matches the message delete it after tiggerTimeout
                        If inverted = true and triggerMessage matches skip, if it doesn't match delete it after triggerTimeout
                        If replyMessage exists send it after replyTimeout, delete after replyDeleteTimeout

CustomCommand -> Vars -> triggerMessage, triggerTimeout, triggerChannelId
                      -> addRoles, removeRoles, extraMessages, extraMessagesTimeout
              -> Method -> On messageCreate if is in a custom command triggerChannelId continue
                           If we have a responseMessage send it, delete after responseTimeout
                           Add any roles listed
                           Remove any roles listed
                           Send any extraMessages we have, delete them all after extraMessagesTimeout

Starboard -> Vars -> 
          -> Method -> 