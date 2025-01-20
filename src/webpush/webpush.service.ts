import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IUser } from 'src/user/entity/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IGroupStudyData } from 'src/groupStudy/entity/groupStudy.entity';
import { IVote } from 'src/vote/entity/vote.entity';
import { IWebPushService } from './webpushService.interface';
import { IWEBPUSH_REPOSITORY } from 'src/utils/di.tokens';
import { WebpushRepository } from './webpush.repository.interface';
import { INotificationSub } from './entity/notificationsub.entity';
import { AppError } from 'src/errors/AppError';
import PushNotifications from 'node-pushnotifications';

@Injectable({ scope: Scope.DEFAULT })
export class WebPushService implements IWebPushService {
  private basePayload: Object;
  private settings: any;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel('User') private readonly User: Model<IUser>,
    @InjectModel('Vote') private readonly Vote: Model<IVote>,
    @InjectModel('GroupStudy') private GroupStudy: Model<IGroupStudyData>,
    @Inject(IWEBPUSH_REPOSITORY)
    private readonly WebpushRepository: WebpushRepository,
  ) {
    const publicKey = this.configService.get<string>('PUBLIC_KEY');
    const privateKey = this.configService.get<string>('PRIVATE_KEY');

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
        url: 'https://study-about.club/',
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
  async subscribe(subscription: any, uid, userId: string) {
    await this.WebpushRepository.enrollSubscribe(userId, uid, subscription);
    return;
  }

  async sendNotificationAllUser() {
    const subscriptions = await this.WebpushRepository.findAll();
    const results = await this.sendParallel(subscriptions, this.basePayload);
    this.logForFailure(results);
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
      const results = await this.sendParallel(subscriptions, payload);

      this.logForFailure(results);

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
      const results = await this.sendParallel(subscriptions, payload);

      this.logForFailure(results);

      return;
    } catch (err: any) {
      throw new HttpException(
        'Error deleting comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async sendNotificationGroupStudy(groupStudyId: string) {
    try {
      const payload = JSON.stringify({
        ...this.basePayload,
        title: '소모임에 누군가 가입했어요!',
        body: '소모임을 확인해보세요.',
      });

      const groupStudy = await this.GroupStudy.findOne({
        groupStudyId,
      }).populate(['participants.user']);

      const memberUids = groupStudy.participants?.map(
        (participant) => (participant.user as IUser).uid,
      );
      const memberArray = Array.from(new Set(memberUids));

      const subscriptions =
        await this.WebpushRepository.findByArray(memberArray);

      const results = await this.sendParallel(subscriptions, payload);
      this.logForFailure(results);
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

    const results = await this.sendParallel(managerSubscriptions, payload);
    this.logForFailure(results);
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

    const failureResults = await this.sendParallel(
      failureSubscriptions,
      failPayload,
    );
    const successResults = await this.sendParallel(
      successSubscriptions,
      successPayload,
    );

    this.logForFailure(failureResults);
    this.logForFailure(successResults);
    return;
  }

  //알림 전송 실패한 사람들 로그
  logForFailure = (results: any[]) => {
    const failed = results.filter((result) => result.status === 'rejected');
    failed.forEach((failure, index) => {
      console.error(
        `Error #${index + 1}:`,
        (failure as PromiseRejectedResult).reason,
      );
    });
    return;
  };

  sendParallel = async (
    subscriptions: INotificationSub[],
    payload: any,
  ): Promise<any> => {
    const limit = 10; // 병렬로 실행할 작업의 최대 개수
    const results: any[] = [];

    // subscriptions 배열을 limit 크기만큼씩 잘라서 실행
    for (let i = 0; i < subscriptions.length; i += limit) {
      const batch = subscriptions.slice(i, i + limit); // 현재 batch만큼 가져오기
      const batchPromises = batch.map(async (subscription) => {
        const push = new PushNotifications(this.settings);
        try {
          await push.send(subscription as any, payload);
          return { status: 'fulfilled' };
        } catch (error) {
          return { status: 'rejected', reason: error };
        }
      });

      // batch의 Promise가 모두 완료될 때까지 대기
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
    }

    return results;
  };
}
