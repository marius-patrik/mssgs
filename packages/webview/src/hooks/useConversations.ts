import { useMemo } from 'react';
import type { Conversation } from '../../../extension/src/shared/types';
import { useMessengerStore } from '../stores/messengerStore';

export function useConversations(): Conversation[] {
  const conversations = useMessengerStore((state) => state.conversations);

  return useMemo(() => {
    const list = Object.values(conversations);

    return list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();

      return bTime - aTime;
    });
  }, [conversations]);
}
