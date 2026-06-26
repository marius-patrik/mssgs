export interface AccountRow {
  id: string;
  service: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ContactRow {
  id: string;
  account_id: string;
  service_contact_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationRow {
  id: string;
  account_id: string;
  type: string;
  title: string | null;
  participant_ids: string;
  last_message_id: string | null;
  unread_count: number;
  is_archived: 0 | 1;
  is_pinned: 0 | 1;
  is_favorite: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  account_id: string;
  sender_id: string;
  text: string;
  status: string;
  is_from_me: 0 | 1;
  reply_to_id: string | null;
  reactions: string;
  attachments: string;
  created_at: string;
  updated_at: string;
}

export interface ReadStateRow {
  conversation_id: string;
  last_read_message_id: string | null;
  last_read_at: string | null;
  unread_count: number;
}

export interface MessageSearchResult {
  messageId: string;
  conversationId: string;
  text: string;
  rank: number;
}
