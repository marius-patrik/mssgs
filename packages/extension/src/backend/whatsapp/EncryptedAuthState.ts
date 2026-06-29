import {
  type AuthenticationState,
  type SignalDataTypeMap,
  type SignalKeyStore,
  initAuthCreds,
} from '@whiskeysockets/baileys';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { EncryptionService } from '../../services/EncryptionService.js';

interface StoredAuthState {
  creds: AuthenticationState['creds'];
  keys: AuthenticationState['keys'];
}

export async function useEncryptedAuthState(
  encryptedPath: string,
  encryption: EncryptionService,
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void>; keys: SignalKeyStore }> {
  const state: AuthenticationState = {
    creds: initAuthCreds(),
    keys: {} as AuthenticationState['keys'],
  };

  if (fs.existsSync(encryptedPath)) {
    try {
      const json = await encryption.decryptFromFile(encryptedPath);
      const parsed = JSON.parse(json) as StoredAuthState;
      state.creds = parsed.creds;
      state.keys = parsed.keys;
    } catch {
      // If decryption fails, start with a fresh auth state.
    }
  }

  fs.mkdirSync(path.dirname(encryptedPath), { recursive: true });

  const persist = async (): Promise<void> => {
    const stored: StoredAuthState = {
      creds: state.creds,
      keys: state.keys,
    };
    await encryption.encryptToFile(JSON.stringify(stored), encryptedPath);
  };

  const saveCreds = async (): Promise<void> => {
    await persist();
  };

  const keys: SignalKeyStore = {
    get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
      const data =
        ((state.keys as unknown as Record<string, Record<string, SignalDataTypeMap[T]>>)[type] as
          | Record<string, SignalDataTypeMap[T]>
          | undefined) ?? {};
      const result: Record<string, SignalDataTypeMap[T]> = {};
      for (const id of ids) {
        const value = data[id] ?? null;
        if (value) {
          result[id] = value;
        }
      }
      return result;
    },
    set: async (data) => {
      for (const [type, values] of Object.entries(data) as [
        keyof SignalDataTypeMap,
        Record<string, SignalDataTypeMap[keyof SignalDataTypeMap]>,
      ][]) {
        const store =
          (((state.keys as unknown as Record<string, Record<string, unknown>>)[type] as
            | Record<string, unknown>
            | undefined) ??= {});
        for (const [id, value] of Object.entries(values)) {
          store[id] = value;
        }
      }
      await persist();
    },
  };

  return { state, saveCreds, keys };
}
