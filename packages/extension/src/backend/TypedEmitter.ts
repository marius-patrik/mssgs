export type EventListener<T> = (payload: T) => void;

export class TypedEmitter<Events extends { [K in keyof Events]: unknown }> {
  private listeners = new Map<string, Set<EventListener<unknown>>>();

  on<K extends keyof Events & string>(event: K, listener: EventListener<Events[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(listener as EventListener<unknown>);
    return () => this.off(event, listener);
  }

  off<K extends keyof Events & string>(event: K, listener: EventListener<Events[K]>): void {
    this.listeners.get(event)?.delete(listener as EventListener<unknown>);
  }

  emit<K extends keyof Events & string>(event: K, payload: Events[K]): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) {
      return;
    }
    for (const listener of eventListeners) {
      listener(payload);
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
