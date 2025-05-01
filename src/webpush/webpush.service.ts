import { InjectQueue } from '@nestjs/bull';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bull';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { Model } from 'mongoose';
import { IGroupStudyData } from 'src/groupStudy/groupStudy.entity';
import { IUser } from 'src/user/user.entity';
import { IWEBPUSH_REPOSITORY } from 'src/utils/di.tokens';
import { IVote } from 'src/vote/vote.entity';
import { WebpushRepository } from './webpush.repository.interface';

// 플러그인 등록
dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable({ scope: Scope.DEFAULT })
export class WebPushService {
  private basePayload: Object;

  constructor(
    @Inject(IWEBPUSH_REPOSITORY)
    private readonly WebpushRepository: WebpushRepository,
    @InjectQueue('webpushQ') private readonly webpushQ: Queue,
    @InjectModel('User') private readonly User: Model<IUser>,
    @InjectModel('Vote') private readonly Vote: Model<IVote>,
    @InjectModel('GroupStudy') private GroupStudy: Model<IGroupStudyData>,
  ) {
    // Send 201 - resource created
    this.basePayload = {
      title: '스터디 투표',
      body: '스터디 마감이 얼마 남지 않았어요. 지금 신청하세요!',
      badge:
        'https://studyabout.s3.ap-northeast-2.amazonaws.com/%EB%8F%99%EC%95%84%EB%A6%AC/ALogo.png',
      icon: 'https://studyabout.s3.ap-northeast-2.amazonaws.com/%EB%8F%99%EC%95%84%EB%A6%AC/144.png',

      data: {
        url: 'https://study-about.club/',
        notificationType: 'studyReminder',
      },
      tag: 'unique_tag_for_this_notification',
      requireInteraction: true,
      silent: false,
      renotify: true,
      timestamp: dayjs().tz('Asia/Seoul').toDate().getTime(),
      // timestamp: Date.now(),
      vibrate: [100, 50, 100],
      priority: 'high',
    };
  }

  //test need
  async subscribe(subscription: any, uid, userId: string) {
    await this.WebpushRepository.enrollSubscribe(userId, uid, subscription);
    return;
  }

  async sendNotificationAllUser(title?: string, description?: string) {
    let payload = this.basePayload;

    if (title && description) {
      payload = JSON.stringify({
        ...this.basePayload,
        title: title || '테스트 알림이에요',
        body: description || '테스트 알림이에요',
      });
    }

    const subscriptions = await this.WebpushRepository.findAll();
    this.webpushQ.add('sendWebpush', {
      subscriptions,
      payload,
    });

    // const results = await this.sendParallel(subscriptions, this.basePayload);
    // this.logForFailure(results);
    return;
  }

  async sendNotificationToX(uid: string, title?: string, description?: string) {
    try {
      const payload = JSON.stringify({
        ...this.basePayload,
        title: title || '테스트 알림이에요',
        body: description || '테스트 알림이에요',
      });

      const subscriptions = await this.WebpushRepository.findByUid(uid);
      this.webpushQ.add('sendWebpush', {
        subscriptions,
        payload,
      });

      // const results = await this.sendParallel(subscriptions, payload);
      // this.logForFailure(results);

      return;
    } catch (err: any) {
      throw new Error('noti failed');
    }
  }

  async sendNotificationToXWithId(
    userId: string,
    title?: string,
    description?: string,
  ) {
    try {
      const payload = JSON.stringify({
        ...this.basePayload,
        title: title || '테스트 알림이에요',
        body: description || '테스트 알림이에요',
      });
      const subscriptions = await this.WebpushRepository.findByUserId(userId);

      this.webpushQ.add('sendWebpush', {
        subscriptions,
        payload,
      });

      return;
    } catch (err: any) {
      throw new HttpException(
        'Error deleting comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async sendNotificationGroupStudy(groupStudyId: string, description: string) {
    try {
      const payload = JSON.stringify({
        ...this.basePayload,
        title: '소모임',
        body: description,
      });

      const groupStudy = await this.GroupStudy.findOne({
        id: groupStudyId,
      }).populate(['participants.user']);

      const memberUids = groupStudy.participants?.map((participant, idx) => {
        return (participant?.user as IUser)?.uid;
      });

      const memberArray = Array.from(new Set(memberUids));

      const subscriptions =
        await this.WebpushRepository.findByArray(memberArray);

      this.webpushQ.add('sendWebpush', {
        subscriptions,
        payload,
      });

      // const results = await this.sendParallel(subscriptions, payload);
      // this.logForFailure(results);
      return;
    } catch (err) {
      throw new HttpException(
        'Error deleting comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //Todo: and 사용하도록 수정
  async sendNotificationToManager(location: string) {
    const managerUidList = (
      await this.User.find({ role: 'manager', location }).lean()
    ).map((manager) => manager.uid);

    const managerSubscriptions =
      await this.WebpushRepository.findByArray(managerUidList);

    const payload = JSON.stringify({
      ...this.basePayload,
      title: '신규 가입 유저가 있어요!',
      body: '앱을 확인해보세요.',
    });

    this.webpushQ.add('sendWebpush', {
      subscriptions: managerSubscriptions,
      payload,
    });
    // const results = await this.sendParallel(managerSubscriptions, payload);
    // this.logForFailure(results);
    return;
  }

  //Todo: dayjs의존성 제가 가능?
  //Todo: Notification에 uid말고 _id기록
  async sendNotificationVoteResult() {
    const failure = new Set<string>();
    const success = new Set<string>();

    const date = new Date();
    date.setHours(0, 0, 0, 0); // 오늘의 시작시간

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

    const failureArr = Array.from(failure);
    const successArr = Array.from(success);

    const failureSubscriptions =
      await this.WebpushRepository.findByArray(failureArr);
    const successSubscriptions =
      await this.WebpushRepository.findByArray(successArr);

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

    this.webpushQ.add('sendWebpush', {
      subscriptions: failureSubscriptions,
      payload: failPayload,
    });
    this.webpushQ.add('sendWebpush', {
      subscriptions: successSubscriptions,
      payload: successPayload,
    });

    return;
  }
}
