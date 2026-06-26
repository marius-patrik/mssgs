import { beforeEach, describe, expect, test, vi } from 'vitest';
import { type BackendConnectionFactory, ConnectionManager } from '../ConnectionManager.js';
import { TypedEmitter } from '../TypedEmitter.js';
import type {
  BackendConnection,
  BackendConnectionEvents,
  BackendConnectionOptions,
  BackendCredentials,
  ConnectionStatus,
  MatrixClientFactory,
  MatrixRoomInfo,
  ServiceAccount,
} from '../types.js';

class FakeConnection extends TypedEmitter<BackendConnectionEvents> implements BackendConnection {
  public status: ConnectionStatus = 'disconnected';
  public rooms: MatrixRoomInfo[] = [];
  public connect = vi.fn().mockResolvedValue(undefined);
  public disconnect = vi.fn().mockResolvedValue(undefined);

  constructor(public readonly accountId: string) {
    super();
  }

  getRooms(): MatrixRoomInfo[] {
    return this.rooms;
  }

  setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.emit('statusChanged', { accountId: this.accountId, status });
  }
}

class FakeMatrixClientFactory implements MatrixClientFactory {
  create(_credentials: BackendCredentials): import('../types.js').MatrixClientLike {
    throw new Error('Matrix factory should not be used when a connection factory is injected');
  }
}

class FakeConnectionFactory implements BackendConnectionFactory {
  connections: FakeConnection[] = [];

  create(account: ServiceAccount, _options: BackendConnectionOptions): BackendConnection {
    const connection = new FakeConnection(account.id);
    this.connections.push(connection);
    return connection;
  }
}

describe('ConnectionManager', () => {
  let connectionFactory: FakeConnectionFactory;
  let manager: ConnectionManager;
  const credentials: BackendCredentials = {
    homeserverUrl: 'https://example.com',
    accessToken: 'token',
  };

  beforeEach(() => {
    connectionFactory = new FakeConnectionFactory();
    manager = new ConnectionManager(new FakeMatrixClientFactory(), {}, connectionFactory);
  });

  test('adds a service account and emits accountAdded', async () => {
    const listener = vi.fn();
    manager.on('accountAdded', listener);

    const account = await manager.addAccount({
      service: 'telegram',
      displayName: 'Telegram',
      credentials,
    });

    expect(account.service).toBe('telegram');
    expect(account.displayName).toBe('Telegram');
    expect(manager.getAccount(account.id)).toEqual(account);
    expect(connectionFactory.connections).toHaveLength(1);
    expect(listener).toHaveBeenCalledWith({ account });
  });

  test('connects an existing account', async () => {
    const account = await manager.addAccount({
      service: 'whatsapp',
      displayName: 'WhatsApp',
      credentials,
    });
    const fake = connectionFactory.connections[0];

    await manager.connect(account.id);
    expect(fake?.connect).toHaveBeenCalled();
  });

  test('throws when connecting an unknown account', async () => {
    await expect(manager.connect('unknown')).rejects.toThrow(
      'No connection found for account unknown',
    );
  });

  test('disconnects an account', async () => {
    const account = await manager.addAccount({
      service: 'instagram',
      displayName: 'Instagram',
      credentials,
    });
    const fake = connectionFactory.connections[0];

    await manager.disconnect(account.id);
    expect(fake?.disconnect).toHaveBeenCalled();
  });

  test('removes an account and emits accountRemoved', async () => {
    const account = await manager.addAccount({
      service: 'imessage',
      displayName: 'iMessage',
      credentials,
    });

    const listener = vi.fn();
    manager.on('accountRemoved', listener);

    await manager.removeAccount(account.id);

    expect(manager.getAccount(account.id)).toBeUndefined();
    expect(listener).toHaveBeenCalledWith({ accountId: account.id });
  });

  test('connects all accounts and does not fail on individual errors', async () => {
    await manager.addAccount({
      service: 'telegram',
      displayName: 'Telegram A',
      credentials,
    });
    await manager.addAccount({
      service: 'telegram',
      displayName: 'Telegram B',
      credentials,
    });

    const [fakeA, fakeB] = connectionFactory.connections;
    fakeA?.connect.mockRejectedValue(new Error('network error'));

    await manager.connectAll();

    expect(fakeA?.connect).toHaveBeenCalled();
    expect(fakeB?.connect).toHaveBeenCalled();
  });

  test('forwards connection events', async () => {
    const account = await manager.addAccount({
      service: 'telegram',
      displayName: 'Telegram',
      credentials,
    });
    const fake = connectionFactory.connections[0];

    const statusListener = vi.fn();
    manager.on('statusChanged', statusListener);

    fake?.setStatus('connected');

    expect(statusListener).toHaveBeenCalledWith({ accountId: account.id, status: 'connected' });
  });

  test('returns all rooms across connections', async () => {
    const account = await manager.addAccount({
      service: 'whatsapp',
      displayName: 'WhatsApp',
      credentials,
    });
    const fake = connectionFactory.connections[0];
    const room: MatrixRoomInfo = {
      roomId: '!room:example.com',
      name: 'Room',
      avatarUrl: null,
      isDM: false,
      memberCount: 3,
      lastEventTimestamp: null,
    };
    fake?.rooms.push(room);

    expect(manager.getRooms(account.id)).toEqual([room]);
    expect(manager.getAllRooms()).toEqual([{ accountId: account.id, rooms: [room] }]);
  });
});
