import { IFcmToken } from './fcmToken.entity';

export interface FcmLogRepository {
  createLog(data: any): Promise<null>;
}
