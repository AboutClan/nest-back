import { Injectable } from '@nestjs/common';
import { WebpushRepository } from './webpush.repository.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  INotificationSub,
  NotificationSub,
} from './entity/notificationsub.entity';

@Injectable()
export class MongoWebpushRepository implements WebpushRepository {
  constructor(
    @InjectModel('NotificationSub')
    private readonly NotificationSub: Model<INotificationSub>,
  ) {}

  async enrollSubscribe(uid: string, subscription: any): Promise<null> {
    try {
      if (!subscription || !subscription.endpoint) {
        throw new Error('no subscription info');
      }

      await NotificationSub.findOneAndUpdate(
        { uid, endpoint: subscription.endpoint },
        {
          ...subscription,
          uid,
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
    return this.NotificationSub.find({ uid });
  }
  async findByArray(targetArr: string[]): Promise<INotificationSub[]> {
    return await this.NotificationSub.find({
      uid: { $in: targetArr },
    });
  }
}
