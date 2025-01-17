import { Inject, Injectable, Logger, Scope } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import dayjs from 'dayjs';
import { Model } from 'mongoose';
import AdminVoteService from 'src/admin/vote/adminVote.service';
import { GroupStudyRepository } from 'src/groupStudy/groupStudy.repository.interface';
import { IUser } from 'src/user/entity/user.entity';
import { IGROUPSTUDY_REPOSITORY, IWEBPUSH_SERVICE } from 'src/utils/di.tokens';
import { IWebPushService } from 'src/webpush/webpushService.interface';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    @Inject(IWEBPUSH_SERVICE) private webPushService: IWebPushService,
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
}
