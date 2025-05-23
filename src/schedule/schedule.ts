import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import dayjs from 'dayjs';
import { Model } from 'mongoose';
import { GatherRepository } from 'src/routes/gather/gather.repository.interface';
import { GroupStudyRepository } from 'src/routes/groupStudy/groupStudy.repository.interface';
import { IUser } from 'src/routes/user/user.entity';
import { DateUtils } from 'src/utils/Date';
import {
  IGATHER_REPOSITORY,
  IGROUPSTUDY_REPOSITORY,
} from 'src/utils/di.tokens';
import { Vote2Service } from 'src/routes/vote2/vote2.service';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { IGatherRepository } from 'src/routes/gather/GatherRepository.interface';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    @Inject(IGATHER_REPOSITORY)
    private readonly gatherRepository: IGatherRepository,
    @Inject(IGROUPSTUDY_REPOSITORY)
    private groupstudyRepository: GroupStudyRepository,
    private readonly vote2Service: Vote2Service,
    @InjectModel(DB_SCHEMA.USER) private readonly User: Model<IUser>,
  ) {}

  //투표 결과 알림
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    timeZone: 'Asia/Seoul',
  })
  async announceVoteResult() {
    try {
      await this.vote2Service.setResult(DateUtils.getTodayYYYYMMDD());
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
