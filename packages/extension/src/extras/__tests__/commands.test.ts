import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { SqliteCache } from '../../cache/index.js';
import { WebviewManager } from '../../webview/WebviewManager.js';
import { registerExtrasCommands } from '../commands.js';
import { ExtrasScheduler } from '../scheduler.js';

vi.mock('vscode', () => import('../../__mocks__/vscode.js'));

function findCommand(calls: [string, () => void][], command: string): (() => void) | undefined {
  return calls.find(([name]) => name === command)?.[1];
}

describe('registerExtrasCommands', () => {
  let manager: WebviewManager;
  let cache: SqliteCache;
  let scheduler: ExtrasScheduler;

  const account = {
    id: '11111111-1111-1111-1111-111111111111',
    service: 'telegram' as const,
    username: 'self',
    displayName: 'Me',
    avatarUrl: null,
    status: 'connected' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    manager = new WebviewManager(vscode.Uri.file('/workspace/packages/extension'));
    cache = new SqliteCache(':memory:');
    cache.syncAccount(account);
    scheduler = new ExtrasScheduler();
    vi.spyOn(manager, 'postEvent');
  });

  afterEach(() => {
    cache.close();
    scheduler.stop();
    vi.clearAllMocks();
  });

  it('registers all extras commands', () => {
    const disposables = registerExtrasCommands(manager, cache, scheduler);

    const registered = (vscode.commands.registerCommand as ReturnType<typeof vi.fn>).mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );

    expect(registered).toContain('mssgs.focusSearch');
    expect(registered).toContain('mssgs.newConversation');
    expect(registered).toContain('mssgs.togglePinConversation');
    expect(registered).toContain('mssgs.toggleFavoriteConversation');
    expect(registered).toContain('mssgs.archiveSelected');
    expect(registered).toContain('mssgs.setReminder');
    expect(registered).toContain('mssgs.scheduleMessage');
    expect(disposables).toHaveLength(7);
  });

  it('focuses search via extras event', () => {
    registerExtrasCommands(manager, cache, scheduler);
    const calls = (vscode.commands.registerCommand as ReturnType<typeof vi.fn>).mock.calls as [
      string,
      () => void,
    ][];

    findCommand(calls, 'mssgs.focusSearch')?.();

    expect(manager.postEvent).toHaveBeenCalledWith({
      type: 'event',
      eventType: 'extras',
      payload: { kind: 'focusSearch' },
    });
  });

  it('opens wizard via extras event', () => {
    registerExtrasCommands(manager, cache, scheduler);
    const calls = (vscode.commands.registerCommand as ReturnType<typeof vi.fn>).mock.calls as [
      string,
      () => void,
    ][];

    findCommand(calls, 'mssgs.newConversation')?.();

    expect(manager.postEvent).toHaveBeenCalledWith({
      type: 'event',
      eventType: 'extras',
      payload: { kind: 'openWizard' },
    });
  });

  it('toggles pin on a selected conversation', async () => {
    const conversation = {
      id: '22222222-2222-2222-2222-222222222222',
      accountId: '11111111-1111-1111-1111-111111111111',
      service: 'telegram' as const,
      type: 'direct' as const,
      title: 'Pinned chat',
      participantIds: ['33333333-3333-3333-3333-333333333333'],
      lastMessageId: null,
      unreadCount: 0,
      isArchived: false,
      isPinned: false,
      isFavorite: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    cache.syncConversation(conversation);

    (vscode.window.showQuickPick as ReturnType<typeof vi.fn>).mockResolvedValue({ conversation });

    registerExtrasCommands(manager, cache, scheduler);
    const calls = (vscode.commands.registerCommand as ReturnType<typeof vi.fn>).mock.calls as [
      string,
      () => void,
    ][];

    const togglePin = findCommand(calls, 'mssgs.togglePinConversation');
    expect(togglePin).toBeDefined();
    await togglePin?.();

    const stored = cache.getConversation(conversation.id);
    expect(stored?.isPinned).toBe(true);
    expect(manager.postEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'event',
        eventType: 'conversations',
        payload: [expect.objectContaining({ id: conversation.id, isPinned: true })],
      }),
    );
  });
});
