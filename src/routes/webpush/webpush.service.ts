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
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import { IGatherData } from 'src/routes/gather/gather.entity';
import { IGroupStudyData } from 'src/routes/groupStudy/groupStudy.entity';
import { IUser } from 'src/routes/user/user.entity';
import { DateUtils } from 'src/utils/Date';
import { IWEBPUSH_REPOSITORY } from 'src/utils/di.tokens';
import { WebpushRepository } from './webpush.repository.interface';

@Injectable({ scope: Scope.DEFAULT })
export class WebPushService {
  private basePayload: Object;

  constructor(
    @Inject(IWEBPUSH_REPOSITORY)
    private readonly WebpushRepository: WebpushRepository,
    @InjectQueue('webpushQ') private readonly webpushQ: Queue,
    @InjectModel(DB_SCHEMA.USER) private readonly User: Model<IUser>,
    @InjectModel(DB_SCHEMA.GROUPSTUDY)
    private GroupStudy: Model<IGroupStudyData>,
    @InjectModel(DB_SCHEMA.GATHER) private Gather: Model<IGatherData>,
  ) {
    // Send 201 - resource created
    this.basePayload = {
      title: WEBPUSH_MSG.BASE.TITLE,
      body: WEBPUSH_MSG.BASE.DESC,
      badge:
        'https://studyabout.s3.ap-northeast-2.amazonaws.com/%EB%8F%99%EC%95%84%EB%A6%AC/%EC%B1%85_100px_%ED%88%AC%EB%AA%85.png',
      icon: 'https://studyabout.s3.ap-northeast-2.amazonaws.com/%EB%8F%99%EC%95%84%EB%A6%AC/256.png',

      data: {
        url: 'https://study-about.club/',
        notificationType: 'studyReminder',
      },
      tag: 'unique_tag_for_this_notification',
      requireInteraction: true,
      silent: false,
      renotify: true,
      timestamp: DateUtils.getMillisecondsNow(),
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
        title: title || WEBPUSH_MSG.TEST,
        body: description || WEBPUSH_MSG.TEST,
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
        title: title || WEBPUSH_MSG.TEST,
        body: description || WEBPUSH_MSG.TEST,
        // link: deepLinkUrl,
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
        title: title || WEBPUSH_MSG.TEST,
        body: description || WEBPUSH_MSG.TEST,
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

  async sendNotificationGather(gatherId: string, description: string) {
    try {
      const payload = JSON.stringify({
        ...this.basePayload,
        title: WEBPUSH_MSG.GATHER.TITLE,
        body: description,
      });

      const gather = await this.Gather.findOne({
        id: gatherId,
      });

      const memberUids = gather.participants?.map((participant, idx) => {
        return participant?.user as string;
      });

      const memberArray = Array.from(new Set(memberUids));

      const subscriptions =
        await this.WebpushRepository.findByArrayUserId(memberArray);

      this.webpushQ.add('sendWebpush', {
        subscriptions,
        payload,
      });

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
      const payload = JSON.stringify({
        ...this.basePayload,
        title: WEBPUSH_MSG.GROUPSTUDY.TITLE,
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
      const payload = JSON.stringify({
        ...this.basePayload,
        title: title,
        body: description,
      });

      const memberArray = Array.from(new Set(userIds));

      const subscriptions =
        await this.WebpushRepository.findByArrayUserId(memberArray);

      this.webpushQ.add('sendWebpush', {
        subscriptions,
        payload,
      });
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
      title: WEBPUSH_MSG.BASE.NEW_USER,
      body: WEBPUSH_MSG.BASE.CHECK_APP,
    });

    this.webpushQ.add('sendWebpush', {
      subscriptions: managerSubscriptions,
      payload,
    });
    // const results = await this.sendParallel(managerSubscriptions, payload);
    // this.logForFailure(results);
    return;
  }
}
