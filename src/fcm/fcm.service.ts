import admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JWT } from 'next-auth/jwt';
import { IDailyCheck } from 'src/dailyCheck/entity/dailyCheck.entity';

@Injectable()
export class FcmService {
  private token?: JWT;
  private payload: any;

  constructor(
    @InjectModel('Collection') private DailyCheck: Model<IDailyCheck>,
    token?: JWT,
  ) {
    this.token = token as JWT;
    const fcm = process.env.FCM_INFO;
    if (!admin.apps.length && fcm) {
      const serviceAccount = JSON.parse(fcm);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    this.payload = {
      notification: {
        title: '알림',
        body: '알림',
      },
      android: {
        notification: {
          icon: 'https://studyabout.s3.ap-northeast-2.amazonaws.com/%EB%8F%99%EC%95%84%EB%A6%AC/144.png',
        },
      },
      webpush: {
        headers: {
          TTL: '1',
          icon: 'https://studyabout.s3.ap-northeast-2.amazonaws.com/%EB%8F%99%EC%95%84%EB%A6%AC/144.png',
        },
      },
    };
  }

  async sendNotification(token: any, message: any) {
    const newPayload = {
      ...this.payload,
      token,
      notification: {
        title: message?.notification.title || '알림',
        body: message?.notification.body || '알림',
      },
    };

    const response = await admin.messaging().send(newPayload);

    return response;
  }

  async deleteToken(uid: string, platform: string) {
    const deleted = await FcmToken.updateOne(
      {
        uid,
      },
      {
        $pull: {
          devices: { platform },
        },
      },
    );

    if (!deleted.modifiedCount)
      throw new DatabaseError('fcm token delete failed');
    return;
  }

  async registerToken(uid: string, fcmToken: string, platform: string) {
    const fcmTokenOne = await FcmToken.findOne({ uid });

    const validatedFcm = FcmTokenZodSchema.parse({
      uid,
      devices: [{ token: fcmToken, platform }],
    });

    if (fcmTokenOne) {
      const tokenExists = fcmTokenOne.devices.some(
        (device) => device.token === fcmToken,
      );

      if (!tokenExists) {
        fcmTokenOne.devices.push({ token: fcmToken, platform });
        await fcmTokenOne.save();
      }
    } else {
      FcmToken.create(validatedFcm);
    }
  }

  async sendNotificationToX(uid: string, title: string, body: string) {
    const user = await FcmToken.findOne({ uid });

    if (!user) throw new DatabaseError("can't find toUser");

    try {
      user.devices.forEach(async (device) => {
        const newPayload = {
          ...this.payload,
          token: device.token,
          notification: {
            title,
            body,
          },
        };
        await admin.messaging().send(newPayload);
      });
    } catch (err: any) {
      throw new AppError('send notifacation failed', 1001);
    }

    return;
  }

  async sendNotificationAllUser(title: string, body: string) {
    try {
      const targets = await FcmToken.find();

      targets.forEach((target) => {
        target.devices.forEach(async (data) => {
          const newPayload = {
            ...this.payload,
            token: data.token,
            notification: {
              title,
              body,
            },
          };
          const response = await admin.messaging().send(newPayload);
        });
      });

      return;
    } catch (err) {
      throw new AppError('send notifacation failed', 1001);
    }
  }
  async sendNotificationVoteResult() {
    const failure = new Set();
    const success = new Set();

    const date = dayjs().startOf('day').subtract(1, 'day').toDate();
    const vote = await findOneVote(date);

    vote?.participations.forEach((participation) => {
      if (participation.status == 'dismissed') {
        participation.attendences?.forEach((attendence) => {
          failure.add((attendence.user as IUser).uid.toString());
        });
      } else if (participation.status == 'open') {
        participation.attendences?.forEach((attendence) => {
          success.add((attendence.user as IUser).uid.toString());
        });
      }
    });

    let successPayload = {
      ...this.payload,
      notification: {
        title: '스터디가 오픈했어요!',
        body: '스터디 투표 결과를 확인해보세요.',
      },
    };

    let failPayload = {
      ...this.payload,
      notification: {
        title: '오늘은 스터디가 열리지 않았어요.',
        body: '내일 스터디 투표를 참여해보세요',
      },
    };

    try {
      const subscriptions = await FcmToken.find();

      subscriptions.forEach(async (subscription) => {
        if (failure.has(subscription.uid)) {
          subscription.devices.forEach(async (device) => {
            await admin
              .messaging()
              .send({ ...failPayload, token: device.token });
          });
        } else if (success.has(subscription.uid)) {
          subscription.devices.forEach(async (device) => {
            await admin
              .messaging()
              .send({ ...successPayload, token: device.token });
          });
        }
      });
      return;
    } catch (err) {
      throw new AppError('send notifacation failed', 1001);
    }
  }
}
