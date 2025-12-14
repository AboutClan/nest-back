import { IFcmToken } from '../../entity/fcmToken.entity';

export interface FcmRepository {
  deleteToken(uid: string, platform: string): Promise<any>;
  deleteByToken(token: string): Promise<any>;
  findByUid(uid: string): Promise<IFcmToken>;
  findByUserId(userId: string): Promise<IFcmToken>;
  findByToken(token: string): Promise<IFcmToken[]>;
  findAll(): Promise<IFcmToken[]>;
  createToken(data: any): Promise<IFcmToken>;
  findByArray(targetArr: string[]): Promise<IFcmToken[]>;
  findByArrayUserId(targetArr: string[]): Promise<IFcmToken[]>;
}
