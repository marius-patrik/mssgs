import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MatrixBackendConnection } from '../MatrixBackendConnection.js';
import type {
  BackendConnectionOptions,
  BackendCredentials,
  MatrixClientFactory,
  MatrixClientLike,
  RawMatrixRoom,
} from '../types.js';

function createRawRoom(overrides: Partial<RawMatrixRoom> = {}): RawMatrixRoom {
  return {
    roomId: '!room:example.com',
    name: 'Room',
    getAvatarUrl: vi.fn().mockReturnValue(null),
    getMemberCount: vi.fn().mockReturnValue(2),
    isSpaceRoom: vi.fn().mockReturnValue(false),
    getLastActiveTimestamp: vi.fn().mockReturnValue(Date.now()),
    ...overrides,
  };
}

function createMockClient(overrides: Partial<MatrixClientLike> = {}): MatrixClientLike {
  return {
    startClient: vi.fn().mockResolvedValue(undefined),
    stopClient: vi.fn(),
    getRooms: vi.fn().mockReturnValue([]),
    getUserId: vi.fn().mockReturnValue('@user:example.com'),
    getAccessToken: vi.fn().mockReturnValue('token'),
    login: vi.fn().mockResolvedValue({ userId: '@user:example.com', accessToken: 'token' }),
    loginWithToken: vi
      .fn()
      .mockResolvedValue({ userId: '@user:example.com', accessToken: 'token' }),
    on: vi.fn(),
    off: vi.fn(),
    ...overrides,
  };
}

class MockMatrixClientFactory implements MatrixClientFactory {
  clients: MatrixClientLike[] = [];

  constructor(private readonly createClient: () => MatrixClientLike = createMockClient) {}

  create(_credentials: BackendCredentials): MatrixClientLike {
    const client = this.createClient();
    this.clients.push(client);
    return client;
  }
}

describe('MatrixBackendConnection', () => {
  let factory: MockMatrixClientFactory;
  const credentials: BackendCredentials = {
    homeserverUrl: 'https://example.com',
    userId: '@user:example.com',
    accessToken: 'initial-token',
  };
  const options: BackendConnectionOptions = { initialSyncLimit: 20 };

  beforeEach(() => {
    factory = new MockMatrixClientFactory();
  });

  test('starts in disconnected state', () => {
    const connection = new MatrixBackendConnection('acc-1', credentials, factory, options);
    expect(connection.status).toBe('disconnected');
    expect(connection.getRooms()).toEqual([]);
  });

  test('connects with access token and emits status changes', async () => {
    const connection = new MatrixBackendConnection('acc-1', credentials, factory, options);
    const statusListener = vi.fn();
    connection.on('statusChanged', statusListener);

    const connectPromise = connection.connect();
    expect(connection.status).toBe('connecting');
    expect(statusListener).toHaveBeenCalledWith({
      accountId: 'acc-1',
      status: 'connecting',
    });

    await connectPromise;
    const client = factory.clients[0];
    expect(client?.startClient).toHaveBeenCalledWith({ initialSyncLimit: 20 });
  });

  test('logs in with password when no token is provided', async () => {
    const passwordCreds: BackendCredentials = {
      homeserverUrl: 'https://example.com',
      userId: '@user:example.com',
      password: 'secret',
    };
    const client = createMockClient({
      getAccessToken: vi.fn().mockReturnValue(null),
      login: vi.fn().mockResolvedValue({
        userId: '@user:example.com',
        accessToken: 'new-token',
        deviceId: 'device-id',
      }),
    });
    const passwordFactory = new MockMatrixClientFactory(() => client);
    const connection = new MatrixBackendConnection('acc-2', passwordCreds, passwordFactory);

    await connection.connect();

    expect(client.login).toHaveBeenCalledWith('user', 'secret');
    expect(passwordFactory.clients).toHaveLength(1);
  });

  test('throws when no token or password is provided', async () => {
    const badCreds: BackendCredentials = {
      homeserverUrl: 'https://example.com',
      userId: '@user:example.com',
    };
    const noTokenClient = createMockClient({
      getAccessToken: vi.fn().mockReturnValue(null),
    });
    const noTokenFactory = new MockMatrixClientFactory(() => noTokenClient);
    const connection = new MatrixBackendConnection('acc-3', badCreds, noTokenFactory);

    await expect(connection.connect()).rejects.toThrow(
      'No access token or password provided for Matrix login',
    );
    expect(connection.status).toBe('error');
  });

  test('disconnects and stops the client', async () => {
    const connection = new MatrixBackendConnection('acc-1', credentials, factory);
    await connection.connect();
    const client = factory.clients[0];

    await connection.disconnect();

    expect(client?.stopClient).toHaveBeenCalled();
    expect(connection.status).toBe('disconnected');
  });

  test('emits connected status on sync prepared event', async () => {
    const connection = new MatrixBackendConnection('acc-1', credentials, factory);
    const statusListener = vi.fn();
    connection.on('statusChanged', statusListener);

    await connection.connect();
    const client = factory.clients[0];
    const syncHandler = vi.mocked(client?.on).mock.calls.find(([event]) => event === 'sync')?.[1];
    expect(syncHandler).toBeDefined();

    syncHandler?.('PREPARED');

    expect(connection.status).toBe('connected');
    expect(statusListener).toHaveBeenCalledWith({ accountId: 'acc-1', status: 'connected' });
  });

  test('emits rooms on sync event', async () => {
    const room = createRawRoom({ roomId: '!dm:example.com', name: 'DM' });
    const client = createMockClient({
      getRooms: vi.fn().mockReturnValue([room]),
    });
    const roomsFactory = new MockMatrixClientFactory(() => client);

    const connection = new MatrixBackendConnection('acc-1', credentials, roomsFactory);
    const roomsListener = vi.fn();
    connection.on('roomsChanged', roomsListener);

    await connection.connect();
    const syncHandler = vi.mocked(client.on).mock.calls.find(([event]) => event === 'sync')?.[1];
    syncHandler?.('SYNCING');

    expect(roomsListener).toHaveBeenCalledTimes(1);
    expect(roomsListener).toHaveBeenCalledWith({
      accountId: 'acc-1',
      rooms: [
        expect.objectContaining({
          roomId: '!dm:example.com',
          name: 'DM',
          isDM: true,
          memberCount: 2,
        }),
      ],
    });
  });

  test('filters out space rooms from room list', async () => {
    const spaceRoom = createRawRoom({
      roomId: '!space:example.com',
      isSpaceRoom: vi.fn().mockReturnValue(true),
    });
    const normalRoom = createRawRoom({ roomId: '!room:example.com' });
    const client = createMockClient({
      getRooms: vi.fn().mockReturnValue([spaceRoom, normalRoom]),
    });
    const spaceFactory = new MockMatrixClientFactory(() => client);

    const connection = new MatrixBackendConnection('acc-1', credentials, spaceFactory);
    await connection.connect();
    const syncHandler = vi.mocked(client.on).mock.calls.find(([event]) => event === 'sync')?.[1];
    syncHandler?.('SYNCING');

    const rooms = connection.getRooms();
    expect(rooms).toHaveLength(1);
    expect(rooms[0]?.roomId).toBe('!room:example.com');
  });

  test('emits error status on sync error event', async () => {
    const connection = new MatrixBackendConnection('acc-1', credentials, factory);
    const errorListener = vi.fn();
    connection.on('error', errorListener);

    await connection.connect();
    const client = factory.clients[0];
    const syncHandler = vi.mocked(client.on).mock.calls.find(([event]) => event === 'sync')?.[1];
    const error = new Error('sync failed');
    syncHandler?.('ERROR', 'PREPARED', { error });

    expect(connection.status).toBe('error');
    expect(errorListener).toHaveBeenCalledWith({ accountId: 'acc-1', error: 'sync failed' });
  });

  test('emits error on session logged out event', async () => {
    const connection = new MatrixBackendConnection('acc-1', credentials, factory);
    const errorListener = vi.fn();
    connection.on('error', errorListener);

    await connection.connect();
    const client = factory.clients[0];
    const loggedOutHandler = vi
      .mocked(client.on)
      .mock.calls.find(([event]) => event === 'Session.logged_out')?.[1];
    loggedOutHandler?.();

    expect(connection.status).toBe('error');
    expect(errorListener).toHaveBeenCalledWith({
      accountId: 'acc-1',
      error: 'Session logged out by server',
    });
  });

  test('initializes crypto when cryptoInitializer is provided', async () => {
    const cryptoInitializer = vi.fn().mockResolvedValue(undefined);
    const connection = new MatrixBackendConnection('acc-1', credentials, factory, {
      cryptoInitializer,
    });

    await connection.connect();
    expect(cryptoInitializer).toHaveBeenCalledWith(factory.clients[0]);
  });
});
