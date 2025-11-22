import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { GatherService } from 'src/routes/gather/gather.service';
import { IGatherRepository } from 'src/routes/gather/GatherRepository.interface';
import GroupStudyService from 'src/routes/groupStudy/groupStudy.service';
import { IGroupStudyRepository } from 'src/routes/groupStudy/GroupStudyRepository.interface';
import { IUser } from 'src/routes/user/user.entity';
import { UserService } from 'src/routes/user/user.service';
import { Vote2Service } from 'src/routes/vote2/vote2.service';
import { DateUtils } from 'src/utils/Date';
import {
  IGATHER_REPOSITORY,
  IGROUPSTUDY_REPOSITORY,
} from 'src/utils/di.tokens';
import { IScheduleLog } from './schedule_log.entity';
import { SCHEDULE_CONST } from 'src/Constants/SCHEDULE';
import { BackupService } from 'src/Database/backup.service';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    @Inject(IGATHER_REPOSITORY)
    private readonly gatherRepository: IGatherRepository,
    @Inject(IGROUPSTUDY_REPOSITORY)
    private groupstudyRepository: IGroupStudyRepository,

    private readonly groupStudyService: GroupStudyService,
    private readonly vote2Service: Vote2Service,
    private readonly gatherService: GatherService,
    private readonly userService: UserService,
    @InjectModel(DB_SCHEMA.USER) private readonly User: Model<IUser>,
    @InjectModel(DB_SCHEMA.SCHEDULE_LOG)
    private readonly ScheduleLog: Model<IScheduleLog>,

    private readonly backupService: BackupService,
  ) {}

  async logSchedule(
    scheduleName: string,
    status: string = 'success',
    err?: string,
  ): Promise<void> {
    const currentKrTime = DateUtils.getKoreaTime();

    const scheduleLog = {
      date: currentKrTime,
      scheduleName,
      status,
      error: err ? err.toString() : undefined,
    };

    try {
      await this.ScheduleLog.create(scheduleLog);
    } catch (error) {
      this.logger.error(`Failed to create schedule log: ${error.message}`);
    }
  }

  @Cron('0 2 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async backupDatabase() {
    try {
      await this.backupService.backupDatabase();
      this.logSchedule(SCHEDULE_CONST.BACKUP_DATABASE, 'success');
    } catch (error) {
      this.logSchedule(SCHEDULE_CONST.BACKUP_DATABASE, 'failure', error);
      throw new Error(error);
    }
  }

  //투표 결과 알림
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    timeZone: 'Asia/Seoul',
  })
  async announceVoteResult() {
    try {
      await this.vote2Service.setResult(DateUtils.getTodayYYYYMMDD());
      this.logSchedule(SCHEDULE_CONST.VOTE_RESULT, 'success');
    } catch (error) {
      this.logSchedule(SCHEDULE_CONST.VOTE_RESULT, 'failure', error);
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
      this.logSchedule(SCHEDULE_CONST.INIT_TARGET_HOUR, 'success');
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.INIT_TARGET_HOUR, 'failure', err);
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
      this.logSchedule(SCHEDULE_CONST.INIT_GROUP_STUDY_ATTENDANCE, 'success');
    } catch (err: any) {
      this.logSchedule(
        SCHEDULE_CONST.INIT_GROUP_STUDY_ATTENDANCE,
        'failure',
        err,
      );
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
      this.logSchedule(SCHEDULE_CONST.UPDATE_GROUP_STUDY_STATUS, 'success');
    } catch (err: any) {
      this.logSchedule(
        SCHEDULE_CONST.UPDATE_GROUP_STUDY_STATUS,
        'failure',
        err,
      );
      throw new Error(err);
    }
  }

  // gather 정산
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Asia/Seoul',
  })
  async distributeGatherDeposit() {
    try {
      await this.gatherService.distributeDeposit();
      this.logSchedule(SCHEDULE_CONST.DISTRIBUTE_GATHER_DEPOSIT, 'success');
    } catch (err: any) {
      this.logSchedule(
        SCHEDULE_CONST.DISTRIBUTE_GATHER_DEPOSIT,
        'failure',
        err,
      );
      throw new Error(err);
    }
  }

  // temperature 정산
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON, {
    timeZone: 'Asia/Seoul',
  })
  async processTemperature() {
    try {
      await this.userService.processTemperature();
      this.logSchedule(SCHEDULE_CONST.PROCESS_TEMPERATURE, 'success');
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.PROCESS_TEMPERATURE, 'failure', err);
      throw new Error(err);
    }
  }

  //monthScore 정산
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT, {
    timeZone: 'Asia/Seoul',
  })
  async processMonthScore() {
    try {
      await this.userService.processMonthScore();
      this.logSchedule(SCHEDULE_CONST.PROCESS_MONTH_SCORE, 'success');
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.PROCESS_MONTH_SCORE, 'failure', err);
      throw new Error(err);
    }
  }

  // ticket 정산
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT, {
    timeZone: 'Asia/Seoul',
  })
  async processTicket() {
    try {
      await this.userService.processTicket();
      this.logSchedule(SCHEDULE_CONST.PROCESS_TICKET, 'success');
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.PROCESS_TICKET, 'failure', err);
      throw new Error(err);
    }
  }

  @Cron('0 10 0 1 * *', {
    timeZone: 'Asia/Seoul',
  })
  async processGroupStudyAttend() {
    try {
      await this.groupStudyService.processGroupStudyAttend();
      this.logSchedule(SCHEDULE_CONST.PROCESS_GROUP_ATTENDANCE, 'success');
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.PROCESS_GROUP_ATTENDANCE, 'failure', err);
      throw new Error(err);
    }
  }

  //매일 저녁 9시 10분으로 수정
  @Cron('0 10 21 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async processDailyCheck() {
    try {
      await this.vote2Service.alertMatching();
      this.logSchedule(SCHEDULE_CONST.PROCESS_VOTE_RESULT, 'success');
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.PROCESS_VOTE_RESULT, 'failure', err);
      throw new Error(err);
    }
  }

  // 스터디 미참여 푸시알림
  // 매일 오후 4시와 오후 8시
  @Cron('0 0 16,20 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async processStudyAbsence() {
    try {
      await this.vote2Service.alertStudyAbsence();
      this.logSchedule(SCHEDULE_CONST.PROCESS_STUDY_ABSENCE, 'success');
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.PROCESS_STUDY_ABSENCE, 'failure', err);
      throw new Error(err);
    }
  }
}
