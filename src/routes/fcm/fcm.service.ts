import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import admin from 'firebase-admin';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import { AppError } from 'src/errors/AppError';
import { DatabaseError } from 'src/errors/DatabaseError';
import { RequestContext } from 'src/request-context';
import { IFCM_REPOSITORY } from 'src/utils/di.tokens';
import { IGatherData } from '../gather/gather.entity';
import { IGroupStudyData } from '../groupStudy/groupStudy.entity';
import { IUser } from '../user/user.entity';
import { FcmRepository } from './fcm.repository.interfae';
import { FcmTokenZodSchema } from './fcmToken.entity';

@Injectable()
export class FcmService {
  private payload: any;
  static MongooseModule: any;

  constructor(
    @Inject(IFCM_REPOSITORY)
    private readonly fcmRepository: FcmRepository,
    @InjectModel(DB_SCHEMA.GROUPSTUDY)
    private GroupStudy: Model<IGroupStudyData>,
    @InjectModel(DB_SCHEMA.GATHER) private Gather: Model<IGatherData>,
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
              title: '알림',
              body: '알림',
            },
            sound: 'default',
            badge: 1,
            'content-available': 1,
          },
        },
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
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
    const token = RequestContext.getDecodedToken();

    const fcmTokenOne = await this.fcmRepository.findByUid(uid);
    const validatedFcm = FcmTokenZodSchema.parse({
      uid,
      userId: token.id,
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
    if (!user) return;
    try {
      for (const device of user.devices) {
        const newPayload = this.createPayload(device.token, title, body);
        try {
          const res = await admin.messaging().send(newPayload);
          console.log('[FCM 성공]', device.token, res);
        } catch (err) {
          console.error('[FCM 실패]', device.token, err);
        }
      }

      //  user.devices.forEach(async (device) => {
      //     const newPayload = {
      //       ...this.payload,
      //       token: device.token,
      //       notification: {
      //         title,
      //         body,
      //       },
      //     };
      //     const newPayload = this.createPayload(device.token, title, body);

      //     await admin.messaging().send(newPayload);
      //   });
      // }
    } catch (err: any) {
      throw new AppError('send notifacation failed', 1001);
    }

    return;
  }

  async sendNotificationToXWithId(userId: string, title: string, body: string) {
    const user = await this.fcmRepository.findByUserId(userId);

    if (!user) return;
    try {
      for (const device of user.devices) {
        const newPayload = this.createPayload(device.token, title, body);
        try {
          const res = await admin.messaging().send(newPayload);
          console.log('[FCM 성공]', device.token, res);
        } catch (err) {
          console.error('[FCM 실패]', device.token, err);
        }
      }
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

  async sendNotificationGather(gatherId: string, description: string) {
    try {
      const gather = await this.Gather.findOne({
        id: gatherId,
      });

      const memberUids = gather.participants?.map((participant, idx) => {
        return participant?.user as string;
      });

      const memberArray = Array.from(new Set(memberUids));

      const subscriptions =
        await this.fcmRepository.findByArrayUserId(memberArray);

      for (const subscription of subscriptions) {
        subscription.devices.forEach(async (device) => {
          const newPayload = {
            ...this.payload,
            token: device.token,
            notification: {
              title: WEBPUSH_MSG.GATHER.TITLE,
              body: description,
            },
          };

          await admin.messaging().send(newPayload);
        });
      }
      return;
    } catch (err) {
      throw new HttpException(
        'Error deleting comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async sendNotificationGroupStudy(groupStudyId: string, description: string) {
    try {
      const groupStudy = await this.GroupStudy.findOne({
        id: groupStudyId,
      }).populate(['participants.user']);

      const memberUids = groupStudy.participants?.map((participant, idx) => {
        return (participant?.user as IUser)?.uid;
      });

      const memberArray = Array.from(new Set(memberUids));

      const subscriptions = await this.fcmRepository.findByArray(memberArray);

      for (const subscription of subscriptions) {
        subscription.devices.forEach(async (device) => {
          const newPayload = {
            ...this.payload,
            token: device.token,
            notification: {
              title: WEBPUSH_MSG.GROUPSTUDY.TITLE,
              body: description,
            },
          };

          await admin.messaging().send(newPayload);
        });
      }

      return;
    } catch (err) {
      throw new HttpException(
        'Error deleting comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async sendNotificationUserIds(
    userIds: string[],
    title: string,
    description: string,
  ) {
    try {
      const memberArray = Array.from(new Set(userIds));

      const subscriptions =
        await this.fcmRepository.findByArrayUserId(memberArray);

      for (const subscription of subscriptions) {
        subscription.devices.forEach(async (device) => {
          const newPayload = {
            ...this.payload,
            token: device.token,
            notification: {
              title,
              body: description,
            },
          };

          await admin.messaging().send(newPayload);
        });
      }

      return;
    } catch (err) {
      throw new HttpException(
        'Error deleting comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  private createPayload(token: string, title: string, body: string) {
    return {
      token,
      notification: { title, body },
      android: {
        notification: {
          icon: 'https://studyabout.s3.ap-northeast-2.amazonaws.com/%EB%8F%99%EC%95%84%EB%A6%AC/144.png',
          channelId: 'about_club_app_push_notification_all',
        },
      },
      webpush: {
        headers: {
          TTL: '1',
        },
        notification: {
          icon: 'https://studyabout.s3.ap-northeast-2.amazonaws.com/%EB%8F%99%EC%95%84%EB%A6%AC/144.png',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: 'default',
            badge: 1,
            'content-available': 1,
          },
        },
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
      },
    };
  }
}
