import type * as vscode from 'vscode';
import { registerExtrasCommands } from './commands.js';
import { registerExtrasHandlers } from './handlers.js';
import { ExtrasScheduler } from './scheduler.js';
import type { ExtrasDependencies } from './types.js';

export * from './scheduler.js';
export * from './types.js';

export function registerExtras(deps: ExtrasDependencies): vscode.Disposable[] {
  const scheduler = new ExtrasScheduler();

  registerExtrasHandlers({ ...deps, scheduler });

  const commandDisposables = registerExtrasCommands(deps.manager, deps.cache, scheduler);

  return [
    ...commandDisposables,
    {
      dispose: () => {
        scheduler.stop();
      },
    },
  ];
}
