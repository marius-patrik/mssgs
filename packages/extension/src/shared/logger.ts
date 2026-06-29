/**
 * Minimal logger surface used by cache and bridge backends.
 * Implementations typically write to a VS Code OutputChannel.
 */
export interface Logger {
  log(message: string): void;
  error(message: string): void;
}
