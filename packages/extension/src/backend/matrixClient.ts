import * as sdk from 'matrix-js-sdk';
import type { MatrixClient as SdkMatrixClient } from 'matrix-js-sdk';
import type { BackendCredentials, MatrixClientFactory, MatrixClientLike } from './types.js';

export class DefaultMatrixClientFactory implements MatrixClientFactory {
  create(credentials: BackendCredentials): MatrixClientLike {
    const client = sdk.createClient({
      baseUrl: credentials.homeserverUrl,
      userId: credentials.userId,
      deviceId: credentials.deviceId,
      accessToken: credentials.accessToken,
      timelineSupport: true,
    });
    return client as unknown as MatrixClientLike;
  }
}

export type { SdkMatrixClient };
