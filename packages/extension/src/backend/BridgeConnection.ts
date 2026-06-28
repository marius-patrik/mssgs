export type BridgeStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface BridgeRoomInfo {
  roomId: string;
  name: string | null;
  avatarUrl: string | null;
  isDM: boolean;
  memberCount: number;
  lastEventTimestamp: number | null;
}

export interface BridgeMessageInfo {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isFromMe: boolean;
}

export interface BridgeAuthPrompt {
  type: 'qr' | 'code' | 'credentials' | 'pairing' | 'none';
  data?: string;
  instruction: string;
}

export interface BridgeConnectionEvents {
  statusChanged: {
    accountId: string;
    status: BridgeStatus;
    error?: string;
  };
  authPrompt: {
    accountId: string;
    prompt: BridgeAuthPrompt;
  };
  roomsChanged: {
    accountId: string;
    rooms: BridgeRoomInfo[];
  };
  messagesChanged: {
    accountId: string;
    roomId: string;
    messages: BridgeMessageInfo[];
  };
  error: {
    accountId: string;
    error: string;
  };
}

export interface BridgeCredentials {
  phoneNumber?: string;
  code?: string;
  username?: string;
  password?: string;
  pairingCode?: string;
  [key: string]: string | undefined;
}

import type { TypedEmitter } from './TypedEmitter.js';

export interface BridgeConnection extends TypedEmitter<BridgeConnectionEvents> {
  readonly accountId: string;
  readonly service: string;
  readonly status: BridgeStatus;
  connect(credentials?: BridgeCredentials): Promise<void>;
  disconnect(): Promise<void>;
  getRooms(): BridgeRoomInfo[];
  sendMessage(roomId: string, text: string): Promise<BridgeMessageInfo>;
  sendCode?(code: string): Promise<void>;
  submitCredentials?(credentials: BridgeCredentials): Promise<void>;
}
