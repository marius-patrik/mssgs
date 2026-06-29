import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import * as fs from 'node:fs';
import * as vscode from 'vscode';

const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_ID = 'mssgs.master';

export class EncryptionService {
  private key: Buffer | undefined;

  constructor(private readonly secrets: vscode.SecretStorage) {}

  async encrypt(plaintext: string): Promise<string> {
    const key = await this.getKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64');
  }

  async decrypt(ciphertext: string): Promise<string> {
    const key = await this.getKey();
    const combined = Buffer.from(ciphertext, 'base64');
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted payload');
    }
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  async encryptFile(plaintextPath: string, encryptedPath: string): Promise<void> {
    const key = await this.getKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const input = fs.readFileSync(plaintextPath);
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, authTag, encrypted]);
    fs.writeFileSync(encryptedPath, combined);
  }

  async decryptFile(encryptedPath: string, plaintextPath: string): Promise<void> {
    const key = await this.getKey();
    const combined = fs.readFileSync(encryptedPath);
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted file');
    }
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    fs.writeFileSync(plaintextPath, decrypted);
  }

  async encryptToFile(plaintext: string, encryptedPath: string): Promise<void> {
    fs.writeFileSync(encryptedPath, await this.encrypt(plaintext), 'utf8');
  }

  async decryptFromFile(encryptedPath: string): Promise<string> {
    return this.decrypt(fs.readFileSync(encryptedPath, 'utf8'));
  }

  private async getKey(): Promise<Buffer> {
    if (this.key) {
      return this.key;
    }

    let stored = await this.secrets.get(KEY_ID);
    if (!stored) {
      const salt = randomBytes(SALT_LENGTH);
      const raw = randomBytes(KEY_LENGTH);
      // Store as "salt:base64key" so we can regenerate the same key if needed.
      // Currently we keep raw key directly; salt is reserved for future key derivation.
      stored = `${salt.toString('base64')}:${raw.toString('base64')}`;
      await this.secrets.store(KEY_ID, stored);
    }

    const parts = stored.split(':');
    if (parts.length !== 2) {
      throw new Error('Malformed encryption key in SecretStorage');
    }
    this.key = Buffer.from(parts[1], 'base64');
    return this.key;
  }
}
