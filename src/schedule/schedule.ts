import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { SCHEDULE_CONST } from 'src/Constants/SCHEDULE';
import { BackupService } from 'src/Database/backup.service';
import { IGatherRepository } from 'src/MSA/Gather/core/interfaces/GatherRepository.interface';
import { GatherService } from 'src/MSA/Gather/core/services/gather.service';
import { IGroupStudyRepository } from 'src/MSA/GroupStudy/core/interfaces/GroupStudyRepository.interface';
import GroupStudyService from 'src/MSA/GroupStudy/core/services/groupStudy.service';
import { Vote2Service } from 'src/MSA/Study/core/services/vote2.service';
import { UserService } from 'src/MSA/User/core/services/user.service';
import { DateUtils } from 'src/utils/Date';
import {
  IGATHER_REPOSITORY,
  IGROUPSTUDY_REPOSITORY,
} from 'src/utils/di.tokens';
import { IScheduleLog } from './schedule_log.entity';

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
    @InjectModel(DB_SCHEMA.SCHEDULE_LOG)
    private readonly ScheduleLog: Model<IScheduleLog>,

    private readonly backupService: BackupService,
  ) { }

  async logSchedule(
    scheduleName: string,
    status: string = 'success',
    flag: string,
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

  async findLogByFlag(flag: string) {
    return this.ScheduleLog.findOne({ flag });
  }

  //매일 2시 DB 백업
  @Cron('0 2 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async backupDatabase() {
    const flag = DateUtils.getTodayYYYYMMDD();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      await this.backupService.backupDatabase();
      await this.logSchedule(SCHEDULE_CONST.BACKUP_DATABASE, 'success', flag);
    } catch (error) {
      await this.logSchedule(SCHEDULE_CONST.BACKUP_DATABASE, 'failure', flag, error);
      throw new Error(error);
    }
  }

  //투표 결과 알림
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    timeZone: 'Asia/Seoul',
  })
  async announceVoteResult() {
    const flag = DateUtils.getTodayYYYYMMDD();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      await this.vote2Service.setResult(DateUtils.getTodayYYYYMMDD());
      await this.logSchedule(SCHEDULE_CONST.VOTE_RESULT, 'success', flag);
    } catch (error) {
      await this.logSchedule(SCHEDULE_CONST.VOTE_RESULT, 'failure', flag, error);
      throw new Error(error);
    }
  }

  //매주 groupStudy 초기화
  @Cron('0 0 0 * * 1', {
    // 매주 월요일 0시 0분
    timeZone: 'Asia/Seoul',
  })
  async initGroupstudyAttend() {
    //flag는 년-월-주차
    const flag = DateUtils.getYearMonthWeek();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      await this.groupstudyRepository.initWeekAttendance();
      this.logSchedule(SCHEDULE_CONST.INIT_GROUP_STUDY_ATTENDANCE, 'success', flag);
    } catch (err: any) {
      this.logSchedule(
        SCHEDULE_CONST.INIT_GROUP_STUDY_ATTENDANCE,
        'failure',
        flag,
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
    const flag = DateUtils.getYearMonthDayHour();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      const current = new Date();
      await this.gatherRepository.updateNotOpened(current);
      this.logSchedule(SCHEDULE_CONST.UPDATE_GROUP_STUDY_STATUS, 'success', flag);
    } catch (err: any) {
      this.logSchedule(
        SCHEDULE_CONST.UPDATE_GROUP_STUDY_STATUS,
        'failure',
        flag,
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
    const flag = DateUtils.getTodayYYYYMMDD();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      await this.gatherService.distributeDeposit();
      this.logSchedule(SCHEDULE_CONST.DISTRIBUTE_GATHER_DEPOSIT, 'success', flag);
    } catch (err: any) {
      this.logSchedule(
        SCHEDULE_CONST.DISTRIBUTE_GATHER_DEPOSIT,
        'failure',
        flag,
        err,
      );
      throw new Error(err);
    }
  }

  // gather 정산
  @Cron('0 15 0 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async gatherPanelty() {
    const flag = DateUtils.getTodayYYYYMMDD();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      await this.gatherService.gatherPanelty();
      this.logSchedule(SCHEDULE_CONST.GATHER_PANELTY, 'success', flag);
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.GATHER_PANELTY, 'failure', flag, err);
      throw new Error(err);
    }
  }

  // temperature 정산 - 매월 1일
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON, {
    timeZone: 'Asia/Seoul',
  })
  async processTemperatureFirst() {
    const flag = DateUtils.getYearMonth();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      await this.userService.processTemperature({ type: 1 });
      this.logSchedule(SCHEDULE_CONST.PROCESS_TEMPERATURE, 'success', flag);
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.PROCESS_TEMPERATURE, 'failure', flag, err);
      throw new Error(err);
    }
  }

  // temperature 정산 - 매월 16일
  @Cron('0 0 16 * *', {
    timeZone: 'Asia/Seoul',
  })
  async processTemperatureSecond() {
    const flag = DateUtils.getYearMonth();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      await this.userService.processTemperature({ type: 2 });
      this.logSchedule(SCHEDULE_CONST.PROCESS_TEMPERATURE, 'success', flag);
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.PROCESS_TEMPERATURE, 'failure', flag, err);
      throw new Error(err);
    }
  }

  //monthScore 정산
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT, {
    timeZone: 'Asia/Seoul',
  })
  async processMonthScore() {
    const flag = DateUtils.getYearMonth();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      await this.userService.processMonthScore();
      this.logSchedule(SCHEDULE_CONST.PROCESS_MONTH_SCORE, 'success', flag);
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.PROCESS_MONTH_SCORE, 'failure', flag, err);
      throw new Error(err);
    }
  }

  // ticket 정산
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT, {
    timeZone: 'Asia/Seoul',
  })
  async processTicket() {
    const flag = DateUtils.getYearMonth();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      await this.userService.processTicket();
      this.logSchedule(SCHEDULE_CONST.PROCESS_TICKET, 'success', flag);
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.PROCESS_TICKET, 'failure', flag, err);
      throw new Error(err);
    }
  }

  //매월 1일 0시 10분   
  @Cron('0 10 0 1 * *', {
    timeZone: 'Asia/Seoul',
  })
  async processGroupStudyAttend() {
    const flag = DateUtils.getYearMonth();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      await this.groupStudyService.processGroupStudyAttend();
      this.logSchedule(SCHEDULE_CONST.PROCESS_GROUP_ATTENDANCE, 'success', flag);
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.PROCESS_GROUP_ATTENDANCE, 'failure', flag, err);
      throw new Error(err);
    }
  }

  //매일 저녁 9시 10분으로 수정
  @Cron('0 10 21 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async processDailyCheck() {
    const flag = DateUtils.getTodayYYYYMMDD();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      await this.vote2Service.alertMatching();
      this.logSchedule(SCHEDULE_CONST.PROCESS_VOTE_RESULT, 'success', flag);
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.PROCESS_VOTE_RESULT, 'failure', flag, err);
      throw new Error(err);
    }
  }

  // 스터디 미참여 푸시알림
  // 매일 오후 4시와 오후 8시
  @Cron('0 0 16,20 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async processStudyAbsence() {
    const flag = DateUtils.getYearMonthDayHour();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      await this.vote2Service.alertStudyAbsence();
      this.logSchedule(SCHEDULE_CONST.PROCESS_STUDY_ABSENCE, 'success', flag);
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.PROCESS_STUDY_ABSENCE, 'failure', flag, err);
      throw new Error(err);
    }
  }

  //매일 새벽 1시 10분 0초
  // 스터디 미참여 요금 정산
  @Cron('0 10 1 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async processAbsenceFee() {
    const flag = DateUtils.getTodayYYYYMMDD();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      await this.vote2Service.processAbsenceFee();
      this.logSchedule(SCHEDULE_CONST.PROCESS_ABSENCE_FEE, 'success', flag);
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.PROCESS_ABSENCE_FEE, 'failure', flag, err);
      throw new Error(err);
    }
  }

  // 스터디 참여 격려
  // 매주 목요일 오후 8시
  @Cron('0 0 20 * * 4', {
    timeZone: 'Asia/Seoul',
  })
  async studyEngage() {
    const flag = DateUtils.getYearMonthWeek();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      await this.userService.processStudyEngage();
      this.logSchedule(SCHEDULE_CONST.PROCESS_STUDY_ENGAGE, 'success', flag);
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.PROCESS_STUDY_ENGAGE, 'failure', flag, err);
      throw new Error(err);
    }
  }

  //매일 한번 멤버십 초기화
  @Cron('30 0 0 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async initMembership() {
    const flag = DateUtils.getTodayYYYYMMDD();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      await this.userService.initMembership();
      this.logSchedule(SCHEDULE_CONST.INIT_MEMBERSHIP, 'success', flag);
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.INIT_MEMBERSHIP, 'failure', flag, err);
      throw new Error(err);
    }
  }

  //월요일 오후 8시
  @Cron('0 0 20 * * 1', {
    timeZone: 'Asia/Seoul',
  })
  async noticeAllUser() {
    const flag = DateUtils.getYearMonthWeek();
    const log = await this.findLogByFlag(flag);
    if (log) {
      return;
    }
    try {
      await this.userService.recommendNoticeAllUser();
      this.logSchedule(SCHEDULE_CONST.NOTICE_ALL_USER, 'success', flag);
    } catch (err: any) {
      this.logSchedule(SCHEDULE_CONST.NOTICE_ALL_USER, 'failure', flag, err);
      throw new Error(err);
    }
  }
}
