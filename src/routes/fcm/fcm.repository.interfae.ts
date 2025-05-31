import { IFcmToken } from './fcmToken.entity';

export interface FcmRepository {
  deleteToken(uid: string, platform: string): Promise<any>;
  findByUid(uid: string): Promise<IFcmToken>;
  findByUserId(userId: string): Promise<IFcmToken>;
  findAll(): Promise<IFcmToken[]>;
  createToken(data: any): Promise<IFcmToken>;
}
