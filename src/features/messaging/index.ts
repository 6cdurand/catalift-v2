/**
 * messaging — public API.
 *
 * App-router pages import from here (`@/features/messaging`); other FEATURES
 * must not (AGENTS.md invariant 1). Notifications stay direct-imported by the
 * /notifications surface — this barrel is the conversation-thread seam that
 * `/messages` and `/clients/[id]` share.
 */

export {
  fetchConversations,
  fetchMessages,
  sendMessage,
  markConversationSeen,
  getOrCreateConversation,
  type ConversationItem,
  type MessageItem,
} from "./api/conversations";

export {
  ConversationThread,
  type ConversationThreadProps,
} from "./components/ConversationThread";
