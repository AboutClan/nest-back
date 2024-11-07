import { IFcmToken } from './entity/fcmToken.entity';

export interface FcmRepository {
  deleteToken(uid: string, platform: string): Promise<any>;
  findByUid(uid: string): Promise<IFcmToken>;
  findAll(): Promise<IFcmToken[]>;
  createToken(data: any): Promise<IFcmToken>;
}
