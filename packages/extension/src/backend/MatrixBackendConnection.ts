import { TypedEmitter } from './TypedEmitter.js';
import type {
  BackendConnection,
  BackendConnectionEvents,
  BackendConnectionOptions,
  BackendCredentials,
  MatrixClientFactory,
  MatrixClientLike,
  MatrixRoomInfo,
  RawMatrixRoom,
} from './types.js';

const SYNC_EVENT = 'sync';
const LOGGED_OUT_EVENT = 'Session.logged_out';
const ERROR_EVENT = 'error';

function toMatrixRoomInfo(room: RawMatrixRoom, homeserverUrl: string): MatrixRoomInfo {
  return {
    roomId: room.roomId,
    name: room.name,
    avatarUrl: room.getAvatarUrl(homeserverUrl, 32, 32, 'scale', false),
    isDM: !room.isSpaceRoom() && room.getMemberCount() <= 2,
    memberCount: room.getMemberCount(),
    lastEventTimestamp: room.getLastActiveTimestamp() || null,
  };
}

export class MatrixBackendConnection
  extends TypedEmitter<BackendConnectionEvents>
  implements BackendConnection
{
  private _status: BackendConnection['status'] = 'disconnected';
  private client: MatrixClientLike | null = null;

  constructor(
    public readonly accountId: string,
    private readonly credentials: BackendCredentials,
    private readonly factory: MatrixClientFactory,
    private readonly options: BackendConnectionOptions = {},
  ) {
    super();
  }

  get status(): BackendConnection['status'] {
    return this._status;
  }

  async connect(): Promise<void> {
    if (this._status === 'connected' || this._status === 'connecting') {
      return;
    }

    this.setStatus('connecting');

    try {
      this.client = this.factory.create(this.credentials);
      this.attachListeners(this.client);

      if (this.options.cryptoInitializer) {
        await this.options.cryptoInitializer(this.client);
      }

      await this.ensureAuthenticated(this.client);

      await this.client.startClient({ initialSyncLimit: this.options.initialSyncLimit ?? 10 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.setStatus('error', message);
      this.emit('error', { accountId: this.accountId, error: message });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.detachListeners(this.client);
      this.client.stopClient();
      this.client = null;
    }
    this.setStatus('disconnected');
  }

  getRooms(): MatrixRoomInfo[] {
    if (!this.client) {
      return [];
    }
    return this.client
      .getRooms()
      .filter((room) => !room.isSpaceRoom())
      .map((room) => toMatrixRoomInfo(room, this.credentials.homeserverUrl));
  }

  private setStatus(status: BackendConnection['status'], error?: string): void {
    this._status = status;
    this.emit('statusChanged', { accountId: this.accountId, status, error });
  }

  private async ensureAuthenticated(client: MatrixClientLike): Promise<void> {
    if (client.getAccessToken() || this.credentials.accessToken) {
      return;
    }

    if (!this.credentials.password) {
      throw new Error('No access token or password provided for Matrix login');
    }

    if (!this.credentials.userId) {
      throw new Error('User ID is required for Matrix password login');
    }

    const localpart = this.credentials.userId.startsWith('@')
      ? this.credentials.userId.slice(1).split(':')[0]
      : this.credentials.userId;

    await client.loginWithPassword(localpart, this.credentials.password);
  }

  private attachListeners(client: MatrixClientLike): void {
    client.on(SYNC_EVENT, this.handleSync);
    client.on(LOGGED_OUT_EVENT, this.handleLoggedOut);
    client.on(ERROR_EVENT, this.handleClientError);
  }

  private detachListeners(client: MatrixClientLike): void {
    client.off(SYNC_EVENT, this.handleSync);
    client.off(LOGGED_OUT_EVENT, this.handleLoggedOut);
    client.off(ERROR_EVENT, this.handleClientError);
  }

  private handleSync = (state: unknown, _prevState?: unknown, data?: unknown): void => {
    const syncState = String(state);
    const syncError =
      data && typeof data === 'object' && 'error' in data && data.error instanceof Error
        ? data.error.message
        : undefined;

    if (syncState === 'SYNCING' || syncState === 'PREPARED') {
      this.setStatus('connected');
      this.emit('roomsChanged', { accountId: this.accountId, rooms: this.getRooms() });
    } else if (syncState === 'ERROR') {
      this.setStatus('error', syncError);
      if (syncError) {
        this.emit('error', { accountId: this.accountId, error: syncError });
      }
    } else if (syncState === 'STOPPED') {
      this.setStatus('disconnected');
    }
  };

  private handleLoggedOut = (): void => {
    this.setStatus('error', 'Session logged out by server');
    this.emit('error', { accountId: this.accountId, error: 'Session logged out by server' });
  };

  private handleClientError = (error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error);
    this.setStatus('error', message);
    this.emit('error', { accountId: this.accountId, error: message });
  };
}
