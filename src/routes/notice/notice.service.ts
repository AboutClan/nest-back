import { Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import { DatabaseError } from 'src/errors/DatabaseError';
import { RequestContext } from 'src/request-context';
import { IUser } from 'src/routes/user/user.entity';
import { IGATHER_REPOSITORY, INOTICE_REPOSITORY } from 'src/utils/di.tokens';
import * as logger from '../../logger';
import { FcmService } from '../fcm/fcm.service';
import { IGatherRepository } from '../gather/GatherRepository.interface';
import { WebPushService } from '../webpush/webpush.service';
import { INotice, NoticeZodSchema } from './notice.entity';
import { NoticeRepository } from './notice.repository.interface';

export default class NoticeService {
  constructor(
    @Inject(INOTICE_REPOSITORY)
    private readonly noticeRepository: NoticeRepository,
    @Inject(IGATHER_REPOSITORY)
    private readonly gatherRepository: IGatherRepository,
    @InjectModel(DB_SCHEMA.USER) private User: Model<IUser>,
    private readonly webPushService: WebPushService,
    private readonly fcmServiceInstance: FcmService,
  ) {}

  async createNotice(noticeData: Partial<INotice>) {
    await this.noticeRepository.createNotice(noticeData);
  }

  async findActiveLog() {
    const token = RequestContext.getDecodedToken();
    const result = await this.noticeRepository.findActiveLog(token.uid);
    return result;
  }
  async getActiveLog() {
    const token = RequestContext.getDecodedToken();

    logger.logger.info('hello', {
      type: 'point',
      value: 2,
    });

    const result = await this.noticeRepository.findActiveLog(token.uid);
    return result;
  }

  async deleteLike(to: string) {
    const updated = await this.User.findOneAndUpdate(
      { uid: to },
      { $inc: { like: -1 } },
    );
    if (!updated) throw new DatabaseError('delete like failed');
  }

  async setLike(to: string, message: string) {
    const token = RequestContext.getDecodedToken();
    try {
      const validatedNotice = NoticeZodSchema.parse({
        from: token.uid,
        to,
        message,
      });

      await this.noticeRepository.createNotice(validatedNotice);
      await this.User.findOneAndUpdate({ uid: to }, { $inc: { like: 1 } });
    } catch (err: any) {
      throw new Error(err);
    }

    await this.webPushService.sendNotificationToX(
      to,
      WEBPUSH_MSG.NOTICE.LIKE_TITLE,
      WEBPUSH_MSG.NOTICE.LIKE_RECIEVE('', ''),
    );
    await this.fcmServiceInstance.sendNotificationToX(
      to,
      WEBPUSH_MSG.NOTICE.LIKE_TITLE,
      WEBPUSH_MSG.NOTICE.LIKE_RECIEVE('', ''),
    );
  }

  async getLike() {
    const token = RequestContext.getDecodedToken();
    const result = await this.noticeRepository.findLike(token.uid);
    return result;
  }
  async getLikeAll() {
    const results = await this.noticeRepository.findLikeAll();
    return results;
  }

  async getFriendRequest() {
    const token = RequestContext.getDecodedToken();
    const result = await this.noticeRepository.findFriend(token.uid);
    return result;
  }

  async requestNotice(
    type: 'friend' | 'alphabet',
    toUid: string,
    message: string,
    sub?: string,
  ) {
    try {
      const token = RequestContext.getDecodedToken();

      await this.noticeRepository.createNotice({
        from: token.uid,
        to: toUid,
        type,
        status: 'pending',
        message,
        sub,
      });
    } catch (err: any) {
      throw new DatabaseError('create notice failed');
    }
  }

  //todo: 이게 무슨로직??
  async updateRequestFriend(
    type: 'friend' | 'alphabet',
    from: string,
    status: string,
  ) {
    const token = RequestContext.getDecodedToken();

    await this.noticeRepository.updateRecentStatus(
      token.uid,
      from,
      type,
      status,
    );

    return;
  }

  async getTemperature() {
    const token = RequestContext.getDecodedToken();
    const result = await this.noticeRepository.findTemperature(token.uid);
    return result;
  }

  async getTemperatureByPeriod(start: Date, end: Date) {
    const result = await this.noticeRepository.findTemperatureByPeriod(
      start,
      end,
    );
    return result;
  }

  async createTemperature(
    infos: { toUid: string; message: string; rating: string }[],
    gatherId: string,
  ) {
    const token = RequestContext.getDecodedToken();
    try {
      for (let info of infos) {
        const validatedNotice = NoticeZodSchema.parse({
          from: token.uid,
          type: 'temperature',
          to: info.toUid,
          message: info.message,
          sub: info.rating,
        });
        await this.noticeRepository.createNotice(validatedNotice);
      }

      const gather = await this.gatherRepository.findById(parseInt(gatherId));
      gather.addReviewers(token.id);
      await this.gatherRepository.save(gather);
    } catch (err: any) {
      throw new Error(err);
    }
  }
}
