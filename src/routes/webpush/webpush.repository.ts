import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from 'src/routes/user/user.entity';
import { INotificationSub } from './notificationsub.entity';
import { WebpushRepository } from './webpush.repository.interface';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

@Injectable()
export class MongoWebpushRepository implements WebpushRepository {
  constructor(
    @InjectModel(DB_SCHEMA.WEBPUSH)
    private readonly NotificationSub: Model<INotificationSub>,
    @InjectModel(DB_SCHEMA.USER)
    private readonly User: Model<IUser>,
  ) {}

  async enrollSubscribe(
    userId: string,
    uid: string,
    subscription: any,
  ): Promise<null> {
    try {
      if (!subscription || !subscription.endpoint) {
        return;
      }

      await this.NotificationSub.findOneAndUpdate(
        { uid },
        {
          ...subscription,
          uid,
          userId,
        },
        { upsert: true }, // 구독이 없을 경우 새로 생성
      );
      return null;
    } catch (err) {
      throw new Error('no subscription info');
    }
  }

  async findAll(): Promise<INotificationSub[]> {
    return await this.NotificationSub.find();
  }
  async findByUid(uid: string): Promise<INotificationSub[]> {
    return await this.NotificationSub.find({ uid });
  }
  async findByUserId(userId: string): Promise<INotificationSub[]> {
    return await this.NotificationSub.find({ userId });
  }
  async findByArray(targetArr: string[]): Promise<INotificationSub[]> {
    return await this.NotificationSub.find({
      uid: { $in: targetArr },
    });
  }
  async findByArrayUserId(targetArr: string[]): Promise<INotificationSub[]> {
    return await this.NotificationSub.find({
      userId: { $in: targetArr },
    });
  }
}
