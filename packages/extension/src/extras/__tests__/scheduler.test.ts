import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExtrasScheduler } from '../scheduler.js';

describe('ExtrasScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules a message and fires when due', () => {
    const onScheduledMessage = vi.fn();
    const scheduler = new ExtrasScheduler({ onScheduledMessage });

    scheduler.scheduleMessage({
      conversationId: '22222222-2222-2222-2222-222222222222',
      text: 'Hello later',
      scheduledAt: new Date(Date.now() + 60000).toISOString(),
    });

    expect(scheduler.getScheduledMessages()).toHaveLength(1);

    vi.advanceTimersByTime(60000);

    expect(onScheduledMessage).toHaveBeenCalledTimes(1);
    expect(onScheduledMessage.mock.calls[0][0].text).toBe('Hello later');
    expect(scheduler.getScheduledMessages()).toHaveLength(0);

    scheduler.stop();
  });

  it('sets a reminder and fires when due', () => {
    const onReminder = vi.fn();
    const scheduler = new ExtrasScheduler({ onReminder });

    scheduler.setReminder({
      messageId: '44444444-4444-4444-4444-444444444444',
      remindAt: new Date(Date.now() + 30000).toISOString(),
    });

    expect(scheduler.getReminders()).toHaveLength(1);

    vi.advanceTimersByTime(30000);

    expect(onReminder).toHaveBeenCalledTimes(1);
    expect(scheduler.getReminders()).toHaveLength(0);

    scheduler.stop();
  });

  it('cancels a scheduled message', () => {
    const scheduler = new ExtrasScheduler();
    const message = scheduler.scheduleMessage({
      conversationId: '22222222-2222-2222-2222-222222222222',
      text: 'Goodbye',
      scheduledAt: new Date(Date.now() + 60000).toISOString(),
    });

    expect(scheduler.cancelScheduledMessage(message.id)).toBe(true);
    expect(scheduler.getScheduledMessages()).toHaveLength(0);
    scheduler.stop();
  });

  it('deletes a reminder', () => {
    const scheduler = new ExtrasScheduler();
    const reminder = scheduler.setReminder({
      messageId: '44444444-4444-4444-4444-444444444444',
      remindAt: new Date(Date.now() + 60000).toISOString(),
    });

    expect(scheduler.deleteReminder(reminder.id)).toBe(true);
    expect(scheduler.getReminders()).toHaveLength(0);
    scheduler.stop();
  });

  it('filters reminders by message id', () => {
    const scheduler = new ExtrasScheduler();
    scheduler.setReminder({
      messageId: '44444444-4444-4444-4444-444444444444',
      remindAt: new Date(Date.now() + 60000).toISOString(),
    });
    scheduler.setReminder({
      messageId: '55555555-5555-5555-5555-555555555555',
      remindAt: new Date(Date.now() + 60000).toISOString(),
    });

    expect(scheduler.getReminders()).toHaveLength(2);
    expect(
      scheduler.getReminders({ messageId: '44444444-4444-4444-4444-444444444444' }),
    ).toHaveLength(1);
    scheduler.stop();
  });
});
