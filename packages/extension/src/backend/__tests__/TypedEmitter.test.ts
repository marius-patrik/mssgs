import { describe, expect, test, vi } from 'vitest';
import { TypedEmitter } from '../TypedEmitter.js';

interface TestEvents {
  greet: { message: string };
  count: { value: number };
}

describe('TypedEmitter', () => {
  test('emits events to registered listeners', () => {
    const emitter = new TypedEmitter<TestEvents>();
    const listener = vi.fn();

    emitter.on('greet', listener);
    emitter.emit('greet', { message: 'hello' });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ message: 'hello' });
  });

  test('removes listeners with off', () => {
    const emitter = new TypedEmitter<TestEvents>();
    const listener = vi.fn();

    emitter.on('greet', listener);
    emitter.off('greet', listener);
    emitter.emit('greet', { message: 'hello' });

    expect(listener).not.toHaveBeenCalled();
  });

  test('returns an unsubscribe function from on', () => {
    const emitter = new TypedEmitter<TestEvents>();
    const listener = vi.fn();

    const unsubscribe = emitter.on('count', listener);
    unsubscribe();
    emitter.emit('count', { value: 42 });

    expect(listener).not.toHaveBeenCalled();
  });

  test('clears all listeners', () => {
    const emitter = new TypedEmitter<TestEvents>();
    const greetListener = vi.fn();
    const countListener = vi.fn();

    emitter.on('greet', greetListener);
    emitter.on('count', countListener);
    emitter.removeAllListeners();

    emitter.emit('greet', { message: 'hello' });
    emitter.emit('count', { value: 1 });

    expect(greetListener).not.toHaveBeenCalled();
    expect(countListener).not.toHaveBeenCalled();
  });
});
