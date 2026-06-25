import type {
  Account,
  Conversation,
  Message,
  NormalizedState,
} from '../../../extension/src/shared/types';
import type { MessengerStore } from './messengerStore';

export type StateSnapshot = NormalizedState;

export interface SyncLayer {
  syncAccounts(accounts: Account[]): void;
  syncConversation(conversation: Conversation): void;
  syncMessage(message: Message): void;
  hydrate(state: StateSnapshot): void;
  snapshot(): StateSnapshot;
}

export class InMemorySyncLayer implements SyncLayer {
  constructor(private readonly getStore: () => MessengerStore) {}

  syncAccounts(accounts: Account[]): void {
    this.getStore().setAccounts(accounts);
  }

  syncConversation(conversation: Conversation): void {
    this.getStore().upsertConversation(conversation);
  }

  syncMessage(message: Message): void {
    this.getStore().upsertMessage(message);
  }

  hydrate(state: StateSnapshot): void {
    this.getStore().hydrate(state);
  }

  snapshot(): StateSnapshot {
    const { accounts, contacts, conversations, messages, activeConversationId } = this.getStore();
    return { accounts, contacts, conversations, messages, activeConversationId };
  }
}
