import { Injectable } from '@nestjs/common';
import { NotificationSub } from './entity/notificationsub.entity';
import { JWT } from 'next-auth/jwt';
import { ConfigService } from '@nestjs/config';
import { AppError } from 'src/errors/AppError';
import dayjs from 'dayjs';
import { findOneVote } from 'src/vote/util';
import { IUser, User } from 'src/user/entity/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  GroupStudy,
  IGroupStudyData,
} from 'src/groupStudy/entity/groupStudy.entity';
const PushNotifications = require('node-pushnotifications');

@Injectable()
export class WebPushService {
  private token: JWT;
  private basePayload: Object;
  private settings: any;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private User: Model<IUser>,
    @InjectModel(GroupStudy.name) private GroupStudy: Model<IGroupStudyData>,
    token?: JWT,
  ) {
    const publicKey = this.configService.get<string>('PUBLIC_KEY');
    const privateKey = this.configService.get<string>('PRIVATE_KEY');

    this.token = token as JWT;
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
    await NotificationSub.updateOne(
      { uid: this.token?.uid, endpoint: subscription.endpoint },
      { ...subscription, uid: this.token?.uid },
      { upsert: true }, // 문서가 없으면 새로 생성, 있으면 업데이트 안 함
    );

    return;
  }

  async sendNotificationAllUser() {
    const subscriptions = await NotificationSub.find();

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

    const subscriptions = await NotificationSub.find({ uid });

    subscriptions.forEach((subscription) => {
      const push = new PushNotifications(this.settings);

      push.send(subscription, payload, (err: any, result: any) => {
        if (err) throw new AppError(`error at ${subscription}`, 500);
      });
    });
    return;
  }

  async sendNotificationGroupStudy(id: string) {
    const payload = JSON.stringify({
      ...this.basePayload,
      title: '소모임에 누군가 가입했어요!',
      body: '소모임을 확인해보세요.',
    });

    const members = new Set();
    const groupStudy = await this.GroupStudy.findOne({ id }).populate([
      'participants.user',
    ]);

    groupStudy?.participants.forEach((participant) => {
      members.add((participant.user as IUser).uid);
    });

    const memberArray = Array.from(members);
    const subscriptions = await NotificationSub.find({
      uid: { $in: memberArray },
    });

    subscriptions.forEach((subscription) => {
      const push = new PushNotifications(this.settings);
      push.send(subscription, payload, (err: any, result: any) => {
        if (err) throw new Error(err);
      });
    });
    return;
  }

  //Todo: and 사용하도록 수정
  async sendNotificationToManager(location: string) {
    const managers = await User.find({ role: 'manager' });
    const managerUidList = new Array();

    managers.forEach((manager) => {
      if (manager.location == location) managerUidList.push(manager.uid);
    });

    const managerNotiInfo = await NotificationSub.find({
      uid: { $in: managerUidList },
    });

    const payload = JSON.stringify({
      ...this.basePayload,
      title: '신규 가입 유저가 있어요!',
      body: '앱을 확인해보세요.',
    });

    managerNotiInfo.forEach((subscription) => {
      const push = new PushNotifications(this.settings);

      push.send(subscription, payload, (err: any, result: any) => {
        if (err) throw new AppError(`error at ${subscription}`, 500);
      });
    });
  }

  //Todo: dayjs의존성 제가 가능?
  //Todo: findOneVote
  async sendNotificationVoteResult() {
    const failure = new Set();
    const success = new Set();

    const date = dayjs().startOf('day').toDate();
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

    try {
      const subscriptions = await NotificationSub.find();

      subscriptions.forEach((subscription) => {
        const push = new PushNotifications(this.settings);

        if (failure.has(subscription.uid)) {
          push.send(subscription, failPayload, (err: any, result: any) => {
            if (err) throw new AppError(err, 500);
          });
        } else if (success.has(subscription.uid)) {
          push.send(subscription, successPayload, (err: any, result: any) => {
            if (err) throw new AppError(err, 500);
          });
        }
      });
      return;
    } catch (err) {
      return;
    }
  }
}
