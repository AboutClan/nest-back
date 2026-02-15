import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IFcmToken } from '../entity/fcmToken.entity';
import { FcmRepository } from '../core/interfaces/fcm.repository.interface';

export class MongoFcmRepository implements FcmRepository {
  constructor(
    @InjectModel('FcmToken')
    private readonly FcmToken: Model<IFcmToken>,
  ) {}
  async createToken(data: any): Promise<IFcmToken> {
    return await this.FcmToken.create(data);
  }
  async deleteByToken(token: string): Promise<any> {
    return await this.FcmToken.updateMany(
      { 'devices.token': token },
      { $pull: { devices: { token: token } } },
    );
  }

  async deleteToken(uid: string, platform: string): Promise<any> {
    return await this.FcmToken.updateOne(
      {
        uid,
      },
      {
        $pull: {
          devices: { platform },
        },
      },
    );
  }

  async findByToken(token: string): Promise<IFcmToken[]> {
    return await this.FcmToken.find({ 'devices.token': token });
  }

  async findByUid(uid: string): Promise<IFcmToken> {
    return await this.FcmToken.findOne({ uid });
  }

  async findByUserId(userId: string): Promise<IFcmToken> {
    return await this.FcmToken.findOne({ userId });
  }

  async findAll(): Promise<IFcmToken[]> {
    return await this.FcmToken.find().lean();
  }

  async findByArray(targetArr: string[]): Promise<IFcmToken[]> {
    return await this.FcmToken.find({
      uid: { $in: targetArr },
    });
  }

  async findByArrayUserId(targetArr: string[]): Promise<IFcmToken[]> {
    return await this.FcmToken.find({
      userId: { $in: targetArr },
    });
  }
}
