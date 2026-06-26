export interface VsCodeApi {
  postMessage(message: unknown): void;
}

declare global {
  interface Window {
    acquireVsCodeApi?(): VsCodeApi;
  }
}

let api: VsCodeApi | undefined;

export function getVsCodeApi(): VsCodeApi | undefined {
  if (api) {
    return api;
  }

  if (
    typeof window !== 'undefined' &&
    'acquireVsCodeApi' in window &&
    typeof window.acquireVsCodeApi === 'function'
  ) {
    api = window.acquireVsCodeApi();
  }

  return api;
}

export function postMessage(message: unknown): void {
  getVsCodeApi()?.postMessage(message);
}

export type MessageHandler = (event: MessageEvent<unknown>) => void;

export function onMessage(handler: MessageHandler): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
