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
  ) {}

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
      flag,
      error: err ? err.toString() : undefined,
    };

    try {
      await this.ScheduleLog.create(scheduleLog);
    } catch (error) {
      this.logger.error(`Failed to create schedule log: ${error.message}`);
    }
  }

  async findLogByFlagAndName(flag: string, name: string) {
    return this.ScheduleLog.findOne({ flag, scheduleName: name });
  }

  //매일 2시 DB 백업
  @Cron('0 2 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async backupDatabase() {
    const name = SCHEDULE_CONST.BACKUP_DATABASE;
    const flag = DateUtils.getTodayYYYYMMDD();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      await this.backupService.backupDatabase();
      await this.logSchedule(name, 'success', flag);
    } catch (error) {
      await this.logSchedule(name, 'failure', flag, error);
      throw new Error(error);
    }
  }

  //투표 결과 알림
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    timeZone: 'Asia/Seoul',
  })
  async announceVoteResult() {
    const name = SCHEDULE_CONST.VOTE_RESULT;
    const flag = DateUtils.getTodayYYYYMMDD();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      await this.vote2Service.setResult(DateUtils.getTodayYYYYMMDD());
      await this.logSchedule(name, 'success', flag);
    } catch (error) {
      await this.logSchedule(name, 'failure', flag, error);
      throw new Error(error);
    }
  }

  //매주 groupStudy 초기화
  @Cron('0 0 0 * * 1', {
    // 매주 월요일 0시 0분
    timeZone: 'Asia/Seoul',
  })
  async initGroupstudyAttend() {
    const name = SCHEDULE_CONST.INIT_GROUP_STUDY_ATTENDANCE;
    //flag는 년-월-주차
    const flag = DateUtils.getYearMonthWeek();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      await this.groupstudyRepository.initWeekAttendance();
      await this.logSchedule(name, 'success', flag);
    } catch (err: any) {
      await this.logSchedule(name, 'failure', flag, err);
      throw new Error(err);
    }
  }

  //매시간 groupStudy 상태 변경
  @Cron(CronExpression.EVERY_6_HOURS, {
    timeZone: 'Asia/Seoul',
  })
  async updateGroupStudyStatus() {
    const name = SCHEDULE_CONST.UPDATE_GROUP_STUDY_STATUS;
    const flag = DateUtils.getYearMonthDayHour();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      const current = new Date();
      await this.gatherRepository.updateNotOpened(current);
      await this.logSchedule(name, 'success', flag);
    } catch (err: any) {
      await this.logSchedule(name, 'failure', flag, err);
      throw new Error(err);
    }
  }

  // gather 정산
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Asia/Seoul',
  })
  async distributeGatherDeposit() {
    const name = SCHEDULE_CONST.DISTRIBUTE_GATHER_DEPOSIT;
    const flag = DateUtils.getTodayYYYYMMDD();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      await this.gatherService.distributeDeposit();
      await this.logSchedule(name, 'success', flag);
    } catch (err: any) {
      await this.logSchedule(name, 'failure', flag, err);
      throw new Error(err);
    }
  }

  // gather 정산
  @Cron('0 15 0 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async gatherPanelty() {
    const name = SCHEDULE_CONST.GATHER_PANELTY;
    const flag = DateUtils.getTodayYYYYMMDD();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      await this.gatherService.gatherPanelty();
      await this.logSchedule(name, 'success', flag);
    } catch (err: any) {
      await this.logSchedule(name, 'failure', flag, err);
      throw new Error(err);
    }
  }

  // temperature 정산 - 매월 1일
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON, {
    timeZone: 'Asia/Seoul',
  })
  async processTemperatureFirst() {
    const name = SCHEDULE_CONST.PROCESS_TEMPERATURE;
    const flag = DateUtils.getYearMonth();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      await this.userService.processTemperature2();
      await this.logSchedule(name, 'success', flag);
    } catch (err: any) {
      await this.logSchedule(name, 'failure', flag, err);
      throw new Error(err);
    }
  }

  // temperature 정산 - 매월 16일
  @Cron('0 0 16 * *', {
    timeZone: 'Asia/Seoul',
  })
  async processTemperatureSecond() {
    const name = SCHEDULE_CONST.PROCESS_TEMPERATURE;
    const flag = DateUtils.getYearMonth();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      await this.userService.processTemperature({ type: 2 });
      await this.logSchedule(name, 'success', flag);
    } catch (err: any) {
      await this.logSchedule(name, 'failure', flag, err);
      throw new Error(err);
    }
  }

  //monthScore 정산
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT, {
    timeZone: 'Asia/Seoul',
  })
  async processMonthScore() {
    const name = SCHEDULE_CONST.PROCESS_MONTH_SCORE;
    const flag = DateUtils.getYearMonth();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      await this.userService.processMonthScore();
      await this.logSchedule(name, 'success', flag);
    } catch (err: any) {
      await this.logSchedule(name, 'failure', flag, err);
      throw new Error(err);
    }
  }

  // ticket 정산
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT, {
    timeZone: 'Asia/Seoul',
  })
  async processTicket() {
    const name = SCHEDULE_CONST.PROCESS_TICKET;
    const flag = DateUtils.getYearMonth();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      await this.userService.processTicket();
      await this.logSchedule(name, 'success', flag);
    } catch (err: any) {
      await this.logSchedule(name, 'failure', flag, err);
      throw new Error(err);
    }
  }

  //매월 1일 0시 10분
  @Cron('0 10 0 1 * *', {
    timeZone: 'Asia/Seoul',
  })
  async processGroupStudyAttend() {
    const name = SCHEDULE_CONST.PROCESS_GROUP_ATTENDANCE;
    const flag = DateUtils.getYearMonth();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      await this.groupStudyService.processGroupStudyAttend();
      await this.logSchedule(name, 'success', flag);
    } catch (err: any) {
      await this.logSchedule(name, 'failure', flag, err);
      throw new Error(err);
    }
  }

  //매일 저녁 9시 10분으로 수정
  @Cron('0 10 21 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async processDailyCheck() {
    const name = SCHEDULE_CONST.PROCESS_VOTE_RESULT;
    const flag = DateUtils.getTodayYYYYMMDD();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      await this.vote2Service.alertMatching();
      await this.logSchedule(name, 'success', flag);
    } catch (err: any) {
      await this.logSchedule(name, 'failure', flag, err);
      throw new Error(err);
    }
  }

  // 스터디 미참여 푸시알림
  // 매일 오후 4시와 오후 8시
  @Cron('0 0 16,20 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async processStudyAbsence() {
    const name = SCHEDULE_CONST.PROCESS_STUDY_ABSENCE;
    const flag = DateUtils.getYearMonthDayHour();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      await this.vote2Service.alertStudyAbsence();
      await this.logSchedule(name, 'success', flag);
    } catch (err: any) {
      await this.logSchedule(name, 'failure', flag, err);
      throw new Error(err);
    }
  }

  //매일 새벽 1시 10분 0초
  // 스터디 미참여 요금 정산
  @Cron('0 10 1 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async processAbsenceFee() {
    const name = SCHEDULE_CONST.PROCESS_ABSENCE_FEE;
    const flag = DateUtils.getTodayYYYYMMDD();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      await this.vote2Service.processAbsenceFee();
      await this.logSchedule(name, 'success', flag);
    } catch (err: any) {
      await this.logSchedule(name, 'failure', flag, err);
      throw new Error(err);
    }
  }

  // 스터디 참여 격려
  // 매주 목요일 오후 8시
  @Cron('0 0 20 * * 4', {
    timeZone: 'Asia/Seoul',
  })
  async studyEngage() {
    const name = SCHEDULE_CONST.PROCESS_STUDY_ENGAGE;
    const flag = DateUtils.getYearMonthWeek();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      await this.userService.processStudyEngage();
      await this.logSchedule(name, 'success', flag);
    } catch (err: any) {
      await this.logSchedule(name, 'failure', flag, err);
      throw new Error(err);
    }
  }

  //매일 한번 멤버십 초기화
  @Cron('30 0 0 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async initMembership() {
    const name = SCHEDULE_CONST.INIT_MEMBERSHIP;
    const flag = DateUtils.getTodayYYYYMMDD();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      await this.userService.initMembership();
      await this.logSchedule(name, 'success', flag);
    } catch (err: any) {
      await this.logSchedule(name, 'failure', flag, err);
      throw new Error(err);
    }
  }

  //월요일 오후 8시
  @Cron('0 0 20 * * 2', {
    timeZone: 'Asia/Seoul',
  })
  async noticeAllUser() {
    const name = SCHEDULE_CONST.NOTICE_ALL_USER;
    const flag = DateUtils.getYearMonthWeek();
    const log = await this.findLogByFlagAndName(flag, name);
    if (log) {
      return;
    }
    try {
      await this.userService.recommendNoticeAllUser();
      await this.logSchedule(name, 'success', flag);
    } catch (err: any) {
      await this.logSchedule(name, 'failure', flag, err);
      throw new Error(err);
    }
  }
}
