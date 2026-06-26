import { useMemo } from 'react';
import type { Contact, Conversation, ServiceType } from '../../../../extension/src/shared/types';
import { useMessengerStore } from '../../stores/messengerStore';
import { getServiceMeta } from './serviceRegistry';

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  const isThisYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: isThisYear ? undefined : 'numeric',
  });
}

function computeInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export interface ConversationDetails {
  title: string;
  initials: string;
  avatarUrl: string | null;
  service: ServiceType;
  serviceMeta: ReturnType<typeof getServiceMeta>;
  lastPreview: string;
  lastTime: string;
  hasUnread: boolean;
}

export function useConversationDetails(conversation: Conversation): ConversationDetails {
  const account = useMessengerStore((state) => state.accounts[conversation.accountId]);
  const contacts = useMessengerStore((state) => state.contacts);
  const messages = useMessengerStore((state) => state.messages);

  return useMemo(() => {
    const participants = conversation.participantIds
      .map((id) => contacts[id])
      .filter((contact): contact is Contact => Boolean(contact));

    const service = account?.service ?? 'matrix';
    const serviceMeta = getServiceMeta(service);

    const title = conversation.title ?? participants[0]?.displayName ?? 'Unknown';
    const initials = computeInitials(title) || '?';
    const avatarUrl = participants[0]?.avatarUrl ?? account?.avatarUrl ?? null;

    const lastMessage = conversation.lastMessageId ? messages[conversation.lastMessageId] : null;
    let lastPreview = 'No messages yet';
    let lastTime = '';

    if (lastMessage) {
      const prefix = lastMessage.isFromMe ? 'You: ' : '';
      const text = lastMessage.text || (lastMessage.attachments.length > 0 ? 'Attachment' : '');
      lastPreview = `${prefix}${text}`;
      lastTime = formatTime(lastMessage.createdAt);
    }

    return {
      title,
      initials,
      avatarUrl,
      service,
      serviceMeta,
      lastPreview,
      lastTime,
      hasUnread: conversation.unreadCount > 0,
    };
  }, [conversation, account, contacts, messages]);
}
