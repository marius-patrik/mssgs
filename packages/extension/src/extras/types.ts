import type { SqliteCache } from '../cache/index.js';
import type { MessageBus } from '../shared/messages.js';
import type { WebviewManager } from '../webview/WebviewManager.js';

export interface ExtrasDependencies {
  bus: MessageBus;
  manager: WebviewManager;
  cache?: SqliteCache;
}
