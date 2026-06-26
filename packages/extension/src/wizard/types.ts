import type { SetupServiceType } from '../services/constants.js';

export type AccountSetupStatus = 'pending' | 'qr' | 'link' | 'awaiting_input' | 'done' | 'error';

export interface AccountSetupSession {
  id: string;
  service: SetupServiceType;
  status: AccountSetupStatus;
  instructions: string;
  qrData?: string;
  link?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AccountSetupResponse {
  sessionId: string;
  status: AccountSetupStatus;
  instructions: string;
  qrData?: string;
  link?: string;
  error?: string;
}
