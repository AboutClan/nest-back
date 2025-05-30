import { InjectModel } from '@nestjs/mongoose';
import { FcmRepository } from './fcm.repository.interfae';
import { Model } from 'mongoose';
import { IFcmToken } from './fcmToken.entity';

export class MongoFcmRepository implements FcmRepository {
  constructor(
    @InjectModel('FcmToken')
    private readonly FcmToken: Model<IFcmToken>,
  ) {}
  async createToken(data: any): Promise<IFcmToken> {
    return await this.FcmToken.create(data);
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
  async findByUid(uid: string): Promise<IFcmToken> {
    return await this.FcmToken.findOne({ uid });
  }

  async findByUserId(userId: string): Promise<IFcmToken> {
    return await this.FcmToken.findOne({ userId });
  }

  async findAll(): Promise<IFcmToken[]> {
    return await this.FcmToken.find();
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
