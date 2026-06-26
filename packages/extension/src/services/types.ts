import type { ServiceType } from '../shared/types.js';

export interface ServiceProfile {
  service: ServiceType;
  displayName: string;
  iconName: string;
  color: string;
  bridgeBotLocalpart: string | null;
}

export interface MatrixRoomCandidate {
  roomId: string;
  name: string | null;
  memberUserIds: string[];
  homeserverUrl: string;
}

export interface SenderInfo {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface ResolvedSender {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  service: ServiceType;
}
