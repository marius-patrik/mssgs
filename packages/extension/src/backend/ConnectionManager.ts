import { MatrixBackendConnection } from './MatrixBackendConnection.js';
import { TypedEmitter } from './TypedEmitter.js';
import { DefaultMatrixClientFactory } from './matrixClient.js';
import type {
  BackendConnection,
  BackendConnectionEvents,
  BackendConnectionOptions,
  BackendCredentials,
  ConnectionStatus,
  MatrixClientFactory,
  MatrixRoomInfo,
  ServiceAccount,
  ServiceType,
} from './types.js';

export interface ConnectionManagerEvents extends BackendConnectionEvents {
  accountAdded: { account: ServiceAccount };
  accountRemoved: { accountId: string };
}

export interface AddAccountInput {
  service: ServiceType;
  displayName: string;
  credentials: BackendCredentials;
}

export interface BackendConnectionFactory {
  create(account: ServiceAccount, options: BackendConnectionOptions): BackendConnection;
}

class MatrixBackendConnectionFactory implements BackendConnectionFactory {
  constructor(private readonly matrixFactory: MatrixClientFactory) {}

  create(account: ServiceAccount, options: BackendConnectionOptions): BackendConnection {
    return new MatrixBackendConnection(
      account.id,
      account.credentials,
      this.matrixFactory,
      options,
    );
  }
}

export class ConnectionManager extends TypedEmitter<ConnectionManagerEvents> {
  private connections = new Map<string, BackendConnection>();
  private accounts = new Map<string, ServiceAccount>();
  private readonly connectionFactory: BackendConnectionFactory;
  private readonly options: BackendConnectionOptions;

  constructor(
    factory: MatrixClientFactory = new DefaultMatrixClientFactory(),
    options: BackendConnectionOptions = {},
    connectionFactory: BackendConnectionFactory = new MatrixBackendConnectionFactory(factory),
  ) {
    super();
    this.connectionFactory = connectionFactory;
    this.options = options;
  }

  getAccount(accountId: string): ServiceAccount | undefined {
    return this.accounts.get(accountId);
  }

  getAccounts(): ServiceAccount[] {
    return Array.from(this.accounts.values());
  }

  getConnectionStatus(accountId: string): ConnectionStatus | undefined {
    return this.connections.get(accountId)?.status;
  }

  getAllStatuses(): Array<{ accountId: string; status: ConnectionStatus }> {
    return Array.from(this.connections.entries()).map(([accountId, connection]) => ({
      accountId,
      status: connection.status,
    }));
  }

  getRooms(accountId: string): MatrixRoomInfo[] {
    return this.connections.get(accountId)?.getRooms() ?? [];
  }

  getAllRooms(): Array<{ accountId: string; rooms: MatrixRoomInfo[] }> {
    return Array.from(this.connections.entries()).map(([accountId, connection]) => ({
      accountId,
      rooms: connection.getRooms(),
    }));
  }

  async addAccount(input: AddAccountInput): Promise<ServiceAccount> {
    const account: ServiceAccount = {
      id: crypto.randomUUID(),
      service: input.service,
      displayName: input.displayName,
      credentials: input.credentials,
    };

    const connection = this.connectionFactory.create(account, this.options);

    this.accounts.set(account.id, account);
    this.connections.set(account.id, connection);
    this.forwardConnectionEvents(connection);

    this.emit('accountAdded', { account });
    return account;
  }

  async connect(accountId: string): Promise<void> {
    const connection = this.connections.get(accountId);
    if (!connection) {
      throw new Error(`No connection found for account ${accountId}`);
    }
    await connection.connect();
  }

  async connectAll(): Promise<void> {
    await Promise.all(
      Array.from(this.connections.values()).map(async (connection) => {
        try {
          await connection.connect();
        } catch {
          // Errors are emitted as events; do not fail the batch.
        }
      }),
    );
  }

  async disconnect(accountId: string): Promise<void> {
    const connection = this.connections.get(accountId);
    if (!connection) {
      return;
    }
    await connection.disconnect();
  }

  async disconnectAll(): Promise<void> {
    await Promise.all(
      Array.from(this.connections.values()).map(async (connection) => {
        try {
          await connection.disconnect();
        } catch {
          // Errors are emitted as events; do not fail the batch.
        }
      }),
    );
  }

  async removeAccount(accountId: string): Promise<void> {
    await this.disconnect(accountId);
    this.connections.delete(accountId);
    this.accounts.delete(accountId);
    this.emit('accountRemoved', { accountId });
  }

  private forwardConnectionEvents(connection: BackendConnection): void {
    connection.on('statusChanged', (payload) => this.emit('statusChanged', payload));
    connection.on('roomsChanged', (payload) => this.emit('roomsChanged', payload));
    connection.on('error', (payload) => this.emit('error', payload));
  }
}
