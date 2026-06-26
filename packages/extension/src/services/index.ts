export { detectService } from './detectService.js';
export {
  createBridgeBotUserId,
  getBridgeBotLocalpart,
  getServiceProfile,
  getSupportedServiceTypes,
} from './serviceRegistry.js';
export { cleanBridgeSuffix, detectSenderService, resolveSender } from './resolveSender.js';
export type {
  MatrixRoomCandidate,
  ResolvedSender,
  SenderInfo,
  ServiceProfile,
} from './types.js';
