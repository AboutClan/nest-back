import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from 'src/user/user.entity';
import { INotificationSub, NotificationSub } from './notificationsub.entity';
import { WebpushRepository } from './webpush.repository.interface';

@Injectable()
export class MongoWebpushRepository implements WebpushRepository {
  constructor(
    @InjectModel('NotificationSub')
    private readonly NotificationSub: Model<INotificationSub>,
    @InjectModel('User')
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

      console.log('sub23', uid, userId, subscription);

      try {
        console.log('start');
        await NotificationSub.findOneAndUpdate(
          { uid, endpoint: subscription.endpoint },
          {
            ...subscription,
            uid,
            userId,
          },
          { upsert: true }, // 구독이 없을 경우 새로 생성
        );
        console.log('end');
      } catch (err) {
        console.log('E', err);
        console.error('실패', err);
      }
      console.log(34);
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
}
