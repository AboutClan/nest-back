import { Inject, Injectable } from '@nestjs/common';
import admin from 'firebase-admin';
import { AppError } from 'src/errors/AppError';
import { DatabaseError } from 'src/errors/DatabaseError';
import { IFCM_REPOSITORY } from 'src/utils/di.tokens';
import { FcmRepository } from './fcm.repository.interfae';
import { FcmTokenZodSchema } from './fcmToken.entity';

@Injectable()
export class FcmService {
  private payload: any;
  static MongooseModule: any;

  constructor(
    @Inject(IFCM_REPOSITORY)
    private readonly fcmRepository: FcmRepository,
  ) {
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
      apns: {
        payload: {
          aps: {
            alert: {
              title: '알림2',
              body: '알림2',
            },
            sound: 'default',
            badge: 1,
          },
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
    const deleted = await this.fcmRepository.deleteToken(uid, platform);

    if (!deleted.modifiedCount)
      throw new DatabaseError('fcm token delet qe failed');
    return;
  }

  async registerToken(uid: string, fcmToken: string, platform: string) {
    const fcmTokenOne = await this.fcmRepository.findByUid(uid);

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
      await this.fcmRepository.createToken(validatedFcm);
    }
  }

  async sendNotificationToX(uid: string, title: string, body: string) {
    const user = await this.fcmRepository.findByUid(uid);
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
      const targets = await this.fcmRepository.findAll();

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
}
