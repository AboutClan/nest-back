import { Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import { DatabaseError } from 'src/errors/DatabaseError';
import { IGatherRepository } from 'src/MSA/Gather/core/interfaces/GatherRepository.interface';
import { IUser } from 'src/MSA/User/entity/user.entity';
import { RequestContext } from 'src/request-context';
import {
  IGATHER_REPOSITORY,
  ILOG_TEMPERATURE_REPOSITORY,
  INOTICE_REPOSITORY,
  IVOTE2_REPOSITORY,
} from 'src/utils/di.tokens';
import * as logger from '../../../../logger';
import { FcmService } from '../../../Notification/core/services/fcm.service';
import { IVote2Repository } from '../../../Study/core/interfaces/Vote2Repository.interface';
import { INotice, NoticeZodSchema } from '../../entity/notice.entity';
import { NoticeRepository } from '../interfaces/notice.repository.interface';
import { ILogTemperatureRepository } from 'src/MSA/User/core/interfaces/LogTemperature.interface';
import { ILogTemperature } from 'src/MSA/User/entity/logTemperature.entity';

export default class NoticeService {
  constructor(
    @Inject(IGATHER_REPOSITORY)
    private readonly groupStudyRepository: IGatherRepository,
    @Inject(INOTICE_REPOSITORY)
    private readonly noticeRepository: NoticeRepository,
    @Inject(IGATHER_REPOSITORY)
    private readonly gatherRepository: IGatherRepository,
    @Inject(IVOTE2_REPOSITORY)
    private readonly vote2Repository: IVote2Repository,
    @Inject(ILOG_TEMPERATURE_REPOSITORY)
    private readonly logTemperatureRepository: ILogTemperatureRepository,

    @InjectModel(DB_SCHEMA.USER) private User: Model<IUser>,
    private readonly fcmServiceInstance: FcmService,
  ) { }

  async createNotice(noticeData: Partial<INotice>) {
    await this.noticeRepository.createNotice(noticeData);
  }

  async findActiveLog(isRecent: 'true' | 'false') {
    const token = RequestContext.getDecodedToken();

    const result = await this.noticeRepository.findActiveLog(
      token.uid,
      isRecent,
    );
    console.log(2, result);
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

      if (type === 'friend') {
        await this.fcmServiceInstance.sendNotificationToX(
          toUid,
          WEBPUSH_MSG.NOTICE.FRIEND_TITLE,
          WEBPUSH_MSG.NOTICE.FRIEND_RECIEVE(token.name),
        );
      }
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

  async getMyTemperature(userId: string) {
    const result = await this.logTemperatureRepository.findMyTemperature(userId);
    return result;
  }

  async getAllTemperature(page: number, userId: string) {
    const token = RequestContext.getDecodedToken();

    const result = await this.logTemperatureRepository.findAllTemperature(page, userId);
    return result;
  }

  async getTemperature() {
    const token = RequestContext.getDecodedToken();
    const result = await this.logTemperatureRepository.findTemperature(token.uid);
    return result;
  }

  async getTemperatureByPeriod(start: Date, end: Date) {
    const result = await this.logTemperatureRepository.findTemperatureByPeriod(
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
        await this.logTemperatureRepository.create({
          from: token.uid,
          to: info.toUid,
          sub: info.rating,
          timestamp: new Date(),
        } as ILogTemperature);
      }

      const gather = await this.gatherRepository.findById(parseInt(gatherId));
      gather.addReviewers(token.id);
      await this.gatherRepository.save(gather);
    } catch (err: any) {
      throw new Error(err);
    }
  }
  async createTemperatureByStudy(
    infos: { toUid: string; message: string; rating: string }[],
    date: string,
    studyId: string,
  ) {
    const token = RequestContext.getDecodedToken();
    try {
      for (let info of infos) {
        await this.logTemperatureRepository.create({
          from: token.uid,
          to: info.toUid,
          sub: info.rating,
          timestamp: new Date(),
        } as ILogTemperature);
      }

      const study = await this.vote2Repository.findByDateWithoutPopulate(date);
      study.addReviewers(studyId, token.id);

      await this.vote2Repository.save(study);
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async test() {
    const result = await this.noticeRepository.test();

    for (const log of result) {
      if (!log?.sub || !log?.from || !log?.to || !log?.createdAt) continue;
      await this.logTemperatureRepository.create({
        from: log.from,
        to: log.to,
        sub: log?.sub,
        timestamp: log?.createdAt,
      } as ILogTemperature);
    }
  }
}
