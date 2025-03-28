import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import dayjs from 'dayjs';
import { Model } from 'mongoose';
import AdminVoteService from 'src/admin/vote/adminVote.service';
import { GatherRepository } from 'src/gather/gather.repository.interface';
import { GroupStudyRepository } from 'src/groupStudy/groupStudy.repository.interface';
import { IUser } from 'src/user/user.entity';
import {
  IGATHER_REPOSITORY,
  IGROUPSTUDY_REPOSITORY,
} from 'src/utils/di.tokens';
import { WebPushService } from 'src/webpush/webpush.service';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    private readonly webPushService: WebPushService,
    @Inject(IGATHER_REPOSITORY) private gatherRepository: GatherRepository,
    @Inject(IGROUPSTUDY_REPOSITORY)
    private groupstudyRepository: GroupStudyRepository,
    private readonly adminVoteService: AdminVoteService,
    @InjectModel('User') private readonly User: Model<IUser>,
  ) {}
  // @Cron('0 18 * * 2,3,5,6', {
  //   timeZone: 'Asia/Seoul',
  // })
  // async sendNotification() {
  //   try {
  //     await this.webPushService.sendNotificationAllUser();
  //     this.logger.log('Notifications sent successfully to all users.');
  //   } catch (error) {
  //     this.logger.error('Error sending notifications:', error);
  //     throw new Error(error);
  //   }
  // }

  //투표 결과 알림
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    timeZone: 'Asia/Seoul',
  })
  async announceVoteResult() {
    try {
      const date = dayjs().format('YYYY-MM-DD');
      await this.adminVoteService.confirm(date);
      await this.webPushService.sendNotificationVoteResult();
      this.logger.log('Vote result notifications sent successfully.');
    } catch (error) {
      this.logger.error('Error sending vote result notifications:', error);
      throw new Error(error);
    }
  }

  //매달 score 초기화
  @Cron('0 0 1 * *', {
    timeZone: 'Asia/Seoul',
  })
  async resetMonthlyScores() {
    try {
      await this.User.updateMany({}, { monthScore: 0 });
      this.logger.log('Monthly scores reset successfully.');
    } catch (error) {
      this.logger.error('Error resetting monthly scores:', error);
      throw new Error(error);
    }
  }

  //매달 gatherTicket 3개로
  @Cron('0 0 1 * *', {
    timeZone: 'Asia/Seoul',
  })
  async resetGatherTicket() {
    try {
      await this.User.updateMany(
        { 'ticket.gatherTicket': { $lt: 3 } },
        {
          $set: { 'ticket.gatherTicket': 3 },
        },
        { new: true, upsert: false },
      );
      this.logger.log('Gather ticket reset successfully.');
    } catch (error) {
      this.logger.error('Error resetting monthly scores:', error);
      throw new Error(error);
    }
  }

  //매주 targetHour 삭제
  @Cron('0 0 0 * * 1', {
    timeZone: 'Asia/Seoul',
  })
  async initTargetHour() {
    try {
      await this.User.updateMany({}, { weekStudyTragetHour: 0 });
      await this.User.updateMany({}, { weekStudyAccumulationMinutes: 0 });
      console.log('target hour init success');
    } catch (err: any) {
      throw new Error(err);
    }
  }

  //매주 groupStudy 초기화
  @Cron('0 0 0 * * 1', {
    // 매주 월요일 0시 0분
    timeZone: 'Asia/Seoul',
  })
  async initGroupstudyAttend() {
    try {
      await this.groupstudyRepository.initWeekAttendance();
    } catch (err: any) {
      throw new Error(err);
    }
  }

  //매시간 groupStudy 상태 변경

  @Cron(CronExpression.EVERY_6_HOURS, {
    timeZone: 'Asia/Seoul',
  })
  async updateGroupStudyStatus() {
    try {
      const current = new Date();
      await this.gatherRepository.updateNotOpened(current);
    } catch (err: any) {
      throw new Error(err);
    }
  }
}
