import type { Reminder, ScheduledMessage } from '../shared/types.js';

export interface SchedulerCallbacks {
  onReminder?: (reminder: Reminder) => void;
  onScheduledMessage?: (message: ScheduledMessage) => void;
}

export class ExtrasScheduler {
  private reminders = new Map<string, Reminder>();
  private scheduledMessages = new Map<string, ScheduledMessage>();
  private interval: ReturnType<typeof setInterval> | null = null;
  private callbacks: SchedulerCallbacks;

  constructor(callbacks: SchedulerCallbacks = {}) {
    this.callbacks = callbacks;
    this.start();
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  setCallbacks(callbacks: SchedulerCallbacks): void {
    this.callbacks = callbacks;
  }

  setReminder(input: Omit<Reminder, 'id' | 'createdAt'>): Reminder {
    const reminder: Reminder = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.reminders.set(reminder.id, reminder);
    return reminder;
  }

  deleteReminder(id: string): boolean {
    return this.reminders.delete(id);
  }

  getReminders(filter?: { messageId?: string }): Reminder[] {
    const reminders = Array.from(this.reminders.values());
    if (!filter?.messageId) {
      return reminders;
    }
    return reminders.filter((reminder) => reminder.messageId === filter.messageId);
  }

  scheduleMessage(input: Omit<ScheduledMessage, 'id' | 'createdAt'>): ScheduledMessage {
    const message: ScheduledMessage = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.scheduledMessages.set(message.id, message);
    return message;
  }

  cancelScheduledMessage(id: string): boolean {
    return this.scheduledMessages.delete(id);
  }

  getScheduledMessages(filter?: { conversationId?: string }): ScheduledMessage[] {
    const messages = Array.from(this.scheduledMessages.values());
    if (!filter?.conversationId) {
      return messages;
    }
    return messages.filter((message) => message.conversationId === filter.conversationId);
  }

  private start(): void {
    this.interval = setInterval(() => this.tick(), 1000);
  }

  private tick(): void {
    const now = Date.now();

    for (const reminder of this.reminders.values()) {
      if (new Date(reminder.remindAt).getTime() <= now) {
        this.reminders.delete(reminder.id);
        this.callbacks.onReminder?.(reminder);
      }
    }

    for (const message of this.scheduledMessages.values()) {
      if (new Date(message.scheduledAt).getTime() <= now) {
        this.scheduledMessages.delete(message.id);
        this.callbacks.onScheduledMessage?.(message);
      }
    }
  }
}
