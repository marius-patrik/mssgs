import { useEffect } from 'react';
import { useMessengerStore } from '../stores/messengerStore';

export interface UseKeyboardShortcutsOptions {
  onNewConversation?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}): void {
  const setActiveConversationId = useMessengerStore((state) => state.setActiveConversationId);
  const markRead = useMessengerStore((state) => state.markRead);
  const togglePin = useMessengerStore((state) => state.togglePin);
  const toggleFavorite = useMessengerStore((state) => state.toggleFavorite);
  const archiveConversation = useMessengerStore((state) => state.archiveConversation);
  const activeConversationId = useMessengerStore((state) => state.activeConversationId);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey;

      if (!hasModifier) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setActiveConversationId(null);
        }
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'n': {
          event.preventDefault();
          options.onNewConversation?.();
          return;
        }
        case 'k': {
          event.preventDefault();
          document.querySelector<HTMLInputElement>('input[aria-label="Search messages"]')?.focus();
          return;
        }
        case 'm': {
          if (event.shiftKey) {
            event.preventDefault();
            const conversationIds = Object.keys(useMessengerStore.getState().conversations);
            for (const conversationId of conversationIds) {
              markRead(conversationId);
            }
          }
          return;
        }
      }

      if (!activeConversationId) {
        return;
      }

      if (event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case 'p': {
            event.preventDefault();
            togglePin(activeConversationId);
            break;
          }
          case 'f': {
            event.preventDefault();
            toggleFavorite(activeConversationId);
            break;
          }
          case 'a': {
            event.preventDefault();
            archiveConversation(activeConversationId);
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeConversationId,
    archiveConversation,
    markRead,
    options,
    setActiveConversationId,
    toggleFavorite,
    togglePin,
  ]);
}
