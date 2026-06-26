import type { ServiceType } from '../shared/types.js';
import type { EventListener } from './TypedEmitter.js';

export type { ServiceType };

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MatrixRoomInfo {
  roomId: string;
  name: string | null;
  avatarUrl: string | null;
  isDM: boolean;
  memberCount: number;
  lastEventTimestamp: number | null;
}

export interface BackendCredentials {
  homeserverUrl: string;
  userId?: string;
  deviceId?: string;
  accessToken?: string;
  password?: string;
}

export interface ServiceAccountConfig {
  service: ServiceType;
  displayName: string;
  bridgeBotLocalpart: string;
}

export interface ServiceAccount {
  id: string;
  service: ServiceType;
  displayName: string;
  credentials: BackendCredentials;
}

export interface BackendConnectionEvents {
  statusChanged: {
    accountId: string;
    status: ConnectionStatus;
    error?: string;
  };
  roomsChanged: {
    accountId: string;
    rooms: MatrixRoomInfo[];
  };
  error: {
    accountId: string;
    error: string;
  };
}

export interface Eventful<Events extends { [K in keyof Events]: unknown }> {
  on<K extends keyof Events & string>(event: K, listener: EventListener<Events[K]>): () => void;
  off<K extends keyof Events & string>(event: K, listener: EventListener<Events[K]>): void;
}

export interface BackendConnection extends Eventful<BackendConnectionEvents> {
  readonly accountId: string;
  readonly status: ConnectionStatus;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getRooms(): MatrixRoomInfo[];
}

export interface RawMatrixRoom {
  roomId: string;
  name: string | null;
  getAvatarUrl(
    baseUrl: string,
    width?: number,
    height?: number,
    resizeMethod?: string,
    allowDefault?: boolean,
  ): string | null;
  getMemberCount(): number;
  isSpaceRoom(): boolean;
  getLastActiveTimestamp(): number;
}

export interface MatrixLoginResponse {
  userId: string;
  accessToken: string;
  deviceId?: string;
}

export interface MatrixClientLike {
  startClient(opts?: { initialSyncLimit?: number }): Promise<void>;
  stopClient(): void;
  getRooms(): RawMatrixRoom[];
  getUserId(): string | null;
  getAccessToken(): string | null;
  login(username: string, password: string): Promise<MatrixLoginResponse>;
  loginWithToken(token: string): Promise<MatrixLoginResponse>;
  initRustCrypto?: () => Promise<void>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
}

export interface MatrixClientFactory {
  create(credentials: BackendCredentials): MatrixClientLike;
}

export type CryptoInitializer = (client: MatrixClientLike) => Promise<void>;

export interface BackendConnectionOptions {
  cryptoInitializer?: CryptoInitializer;
  initialSyncLimit?: number;
}
