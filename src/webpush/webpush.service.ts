import { Inject, Injectable } from '@nestjs/common';
import { JWT } from 'next-auth/jwt';
import { ConfigService } from '@nestjs/config';
import { AppError } from 'src/errors/AppError';
import dayjs from 'dayjs';
import { IUser } from 'src/user/entity/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IGroupStudyData } from 'src/groupStudy/entity/groupStudy.entity';
import { IVote } from 'src/vote/entity/vote.entity';
import { IWebPushService } from './webpushService.interface';
import { IWEBPUSH_REPOSITORY } from 'src/utils/di.tokens';
import { WebpushRepository } from './webpush.repository.interface';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Cron } from '@nestjs/schedule';
const PushNotifications = require('node-pushnotifications');

@Injectable()
export class WebPushService implements IWebPushService {
  private token: JWT;
  private basePayload: Object;
  private settings: any;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel('User') private readonly User: Model<IUser>,
    @InjectModel('Vote') private readonly Vote: Model<IVote>,
    @InjectModel('GroupStudy') private GroupStudy: Model<IGroupStudyData>,
    @Inject(IWEBPUSH_REPOSITORY)
    private readonly WebpushRepository: WebpushRepository,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    const publicKey = this.configService.get<string>('PUBLIC_KEY');
    const privateKey = this.configService.get<string>('PRIVATE_KEY');

    this.token = this.request.decodedToken;
    this.settings = {
      web: {
        vapidDetails: {
          subject: 'mailto:alsrhks0503@gmail.com',
          publicKey: publicKey,
          privateKey: privateKey,
        },
        gcmAPIKey: 'gcmkey',
        TTL: 2419200,
        contentEncoding: 'aes128gcm',
        headers: {},
      },
      android: {
        priority: 'high', // 우선 순위 설정
      },
      isAlwaysUseFCM: true,
    };

    // Send 201 - resource created
    this.basePayload = {
      title: '스터디 투표',
      body: '스터디 마감이 얼마 남지 않았어요. 지금 신청하세요!',
      badge:
        'https://studyabout.s3.ap-northeast-2.amazonaws.com/%EB%8F%99%EC%95%84%EB%A6%AC/ALogo.png',
      icon: 'https://studyabout.s3.ap-northeast-2.amazonaws.com/%EB%8F%99%EC%95%84%EB%A6%AC/144.png',

      data: {
        url: 'https://studyabout.herokuapp.com/',
        notificationType: 'studyReminder',
      },
      tag: 'unique_tag_for_this_notification',
      requireInteraction: true,
      silent: false,
      renotify: true,
      timestamp: Date.now(),
      vibrate: [100, 50, 100],
      priority: 'high',
    };
  }

  //test need
  async subscribe(subscription: any) {
    await this.WebpushRepository.enrollSubscribe(this.token?.uid, subscription);

    return;
  }

  async sendNotificationAllUser() {
    const subscriptions = await this.WebpushRepository.findAll();

    for (const subscription of subscriptions) {
      try {
        const push = new PushNotifications(this.settings);

        // Create payload
        await push.send(subscription, this.basePayload);
      } catch (err) {
        console.log(
          `Failed to send notification to subscription: ${subscription}, error: ${err}`,
        );
        // Continue to the next subscription without breaking the loop
        continue;
      }
    }

    console.log('sending notification success');
    return;
  }

  async sendNotificationToX(uid: string, title?: string, description?: string) {
    const payload = JSON.stringify({
      ...this.basePayload,
      title: title || '테스트 알림이에요',
      body: description || '테스트 알림이에요',
    });

    const subscriptions = await this.WebpushRepository.findByUid(uid);

    subscriptions.forEach((subscription) => {
      const push = new PushNotifications(this.settings);

      push.send(subscription, payload, (err: any, result: any) => {
        console.log(result);
        if (err) throw new AppError(`error at ${subscription}`, 500);
      });
    });
    return;
  }

  async sendNotificationGroupStudy(groupStudyId: string) {
    const payload = JSON.stringify({
      ...this.basePayload,
      title: '소모임에 누군가 가입했어요!',
      body: '소모임을 확인해보세요.',
    });

    const groupStudy = await this.GroupStudy.findOne({ groupStudyId }).populate(
      ['participants.user'],
    );

    const memberUids = groupStudy.participants.map(
      (participant) => (participant.user as IUser).uid,
    );
    const memberArray = Array.from(new Set(memberUids));

    // const subscriptions = await this.NotificationSub.find({
    //   uid: { $in: memberArray },
    // });
    const subscriptions = await this.WebpushRepository.findByArray(memberArray);

    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(10);

    // 병렬로 알림 전송
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        limit(async () => {
          const push = new PushNotifications(this.settings);
          await push.send(subscription, payload);
        });
      }),
    );

    const failed = results.filter((result) => result.status === 'rejected');

    failed.forEach((failure, index) => {
      console.error(
        `Error #${index + 1}:`,
        (failure as PromiseRejectedResult).reason,
      );
    });

    return;
  }

  //Todo: and 사용하도록 수정
  async sendNotificationToManager(location: string) {
    const managerUidList = (
      await this.User.find({ role: 'manager', location }).lean()
    ).map((manager) => manager.uid);

    const managerNotiInfo =
      await this.WebpushRepository.findByArray(managerUidList);

    const payload = JSON.stringify({
      ...this.basePayload,
      title: '신규 가입 유저가 있어요!',
      body: '앱을 확인해보세요.',
    });

    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(10);

    // 병렬로 알림 전송
    const results = await Promise.allSettled(
      managerNotiInfo.map(async (subscription) => {
        limit(async () => {
          const push = new PushNotifications(this.settings);
          await push.send(subscription, payload);
        });
      }),
    );

    const failed = results.filter((result) => result.status === 'rejected');

    failed.forEach((failure, index) => {
      console.error(
        `Error #${index + 1}:`,
        (failure as PromiseRejectedResult).reason,
      );
    });
  }

  //Todo: dayjs의존성 제가 가능?

  //Todo: Notification에 uid말고 _id기록
  async sendNotificationVoteResult() {
    const failure = new Set();
    const success = new Set();

    const date = dayjs().startOf('day').toDate();
    const vote = await this.Vote.findOne({ date }).populate([
      'participations.attendences.user',
    ]);

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

    const successPayload = JSON.stringify({
      ...this.basePayload,
      title: '스터디가 오픈했어요!',
      body: '스터디 투표 결과를 확인해보세요.',
    });

    const failPayload = JSON.stringify({
      ...this.basePayload,
      title: '오늘은 스터디가 열리지 않았어요.',
      body: '내일 스터디 투표를 참여해보세요',
    });

    const subscriptions = await this.WebpushRepository.findAll();

    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(10);

    const results = await Promise.allSettled(
      subscriptions.map((subscription) => {
        limit(async () => {
          const push = new PushNotifications(this.settings);

          if (failure.has(subscription.uid)) {
            await push.send(
              subscription,
              failPayload,
              (err: any, result: any) => {
                if (err) throw new AppError(err, 500);
              },
            );
          } else if (success.has(subscription.uid)) {
            await push.send(
              subscription,
              successPayload,
              (err: any, result: any) => {
                if (err) throw new AppError(err, 500);
              },
            );
          }
        });
      }),
    );

    const failed = results.filter((result) => result.status === 'rejected');

    failed.forEach((failure, index) => {
      console.error(
        `Error #${index + 1}:`,
        (failure as PromiseRejectedResult).reason,
      );
    });
    return;
  }

  // @Cron('54 22 * * *', {
  //   timeZone: 'Asia/Seoul',
  // })
  // async asendNotificationToX() {
  //   try {
  //     console.log(12);
  //     await this.sendNotificationToX('2283035576');
  //     console.log('hello');
  //   } catch (error) {
  //     throw new Error(error);
  //   }
  // }
}
