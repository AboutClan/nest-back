import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import admin from 'firebase-admin';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import { AppError } from 'src/errors/AppError';
import { DatabaseError } from 'src/errors/DatabaseError';
import { RequestContext } from 'src/request-context';
import { DateUtils } from 'src/utils/Date';
import {
  IFCM_LOG_REPOSITORY,
  IFCM_REPOSITORY,
  IREALTIME_REPOSITORY,
  IVOTE2_REPOSITORY,
} from 'src/utils/di.tokens';
import { IGatherData } from '../gather/gather.entity';
import { IGroupStudyData } from '../groupStudy/groupStudy.entity';
import { IRealtimeRepository } from '../realtime/RealtimeRepository.interface';
import { IUser } from '../user/user.entity';
import { IVote2Repository } from '../vote2/Vote2Repository.interface';
import { FcmRepository } from './fcm.repository.interface';
import { FcmLogRepository } from './fcmLog.repository.interface';
import { FcmTokenZodSchema } from './fcmToken.entity';

@Injectable()
export class FcmService {
  private payload: any;
  static MongooseModule: any;

  constructor(
    @Inject(IFCM_REPOSITORY)
    private readonly fcmRepository: FcmRepository,
    @Inject(IFCM_LOG_REPOSITORY)
    private readonly fcmLogRepository: FcmLogRepository,
    @InjectModel(DB_SCHEMA.GROUPSTUDY)
    private GroupStudy: Model<IGroupStudyData>,
    @InjectModel(DB_SCHEMA.GATHER) private Gather: Model<IGatherData>,

    @Inject(IVOTE2_REPOSITORY)
    private readonly vote2Repository: IVote2Repository,
    @Inject(IREALTIME_REPOSITORY)
    private readonly realtimeRepository: IRealtimeRepository,
  ) {
    const fcm = process.env.FCM_INFO;
    if (!admin.apps.length && fcm) {
      const serviceAccount = JSON.parse(fcm);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  }

  async sendNotification(token: any, message: any) {
    const newPayload = this.createPayload(
      token,
      message?.notification.title,
      message?.notification.body,
    );

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
    if (!uid || !fcmToken) return;

    const token = RequestContext.getDecodedToken();

    const fcmTokenOne = await this.fcmRepository.findByUid(uid);
    const validatedFcm = FcmTokenZodSchema.parse({
      uid,
      userId: token.id,
      devices: [{ token: fcmToken, platform }],
    });

    if (fcmTokenOne) {
      fcmTokenOne.devices = fcmTokenOne.devices.filter(
        (device) => device.token !== fcmToken,
      );
      fcmTokenOne.devices.push({ token: fcmToken, platform });
      await fcmTokenOne.save();
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

  async sendNotificationStudy(title: string, body: string) {
    const today = '2025-08-01';
    const vote2UserIDs =
      await this.vote2Repository.findAllUserIdsAfterDate(today);
    const realtimeUserIDs =
      await this.realtimeRepository.findAllUserIdsAfterDate(today);

    const userIds = new Set([...vote2UserIDs, ...realtimeUserIDs]);
    const userIdsArray = Array.from(userIds);

    await this.sendNotificationUserIds(userIdsArray, title, body);
  }

  async sendNotificationAllUser(title: string, body: string) {
    try {
      const targets = await this.fcmRepository.findAll();
      const BATCH_SIZE = 20;

      const results = [];
      const failed = [];
      const successfulUids = new Set<string>(); // uid만 저장하는 Set

      // uid 정보를 포함한 디바이스 배열 생성
      const devicesWithUid = targets.flatMap((target) =>
        target.devices.map((device) => ({
          ...device,
          uid: target.uid,
        })),
      );

      for (let i = 0; i < devicesWithUid.length; i += BATCH_SIZE) {
        const batch = devicesWithUid.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (data) => {
          try {
            const newPayload = this.createPayload(data.token, title, body);

            if (!newPayload) throw new AppError('payload is null', 1001);

            const result = await admin.messaging().send(newPayload);
            return {
              success: true,
              result,
              token: data.token,
              uid: data.uid,
            };
          } catch (error) {
            return {
              success: false,
              error,
              token: data.token,
              uid: data.uid,
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);

        for (const settledResult of batchResults) {
          if (settledResult.status === 'fulfilled') {
            const { success, result, token, error, uid } = settledResult.value;

            if (success) {
              results.push(result);
              successfulUids.add(uid); // uid만 추가
            } else {
              failed.push({ uid, error: error.message });

              if (
                error.code === 'messaging/registration-token-not-registered'
              ) {
                await this.removeInvalidTokenFromDB(token);
              }
            }
          }
        }

        if (i + BATCH_SIZE < devicesWithUid.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Set을 배열로 변환
      const successUidsArray = Array.from(successfulUids);

      await this.fcmLogRepository.createLog({
        title,
        description: body,
        successUids: successUidsArray,
        failed,
      });

      return {
        totalProcessed: devicesWithUid.length,
        successUids: successUidsArray,
        failed,
      };
    } catch (err) {
      throw new AppError('send notification failed', 1001);
    }
  }

  // 유효하지 않은 토큰을 DB에서 제거하는 메서드
  private async removeInvalidTokenFromDB(invalidToken: string) {
    await this.fcmRepository.deleteByToken(invalidToken);
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
        for (const device of subscription.devices) {
          const newPayload = this.createPayload(
            device.token,
            `새로운 모임 후기 도착!`,
            `${DateUtils.formatGatherDate(gather.date)} 모임의 후기가 올라왔어요!`,
          );
          await admin.messaging().send(newPayload);
        }
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
        for (const device of subscription.devices) {
          const newPayload = this.createPayload(
            device.token,
            WEBPUSH_MSG.GROUPSTUDY.TITLE,
            description,
          );

          await admin.messaging().send(newPayload);
        }
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
        for (const device of subscription.devices) {
          const newPayload = this.createPayload(
            device.token,
            title,
            description,
          );

          await admin.messaging().send(newPayload);
        }
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
    if (!title || !body) return null;

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
