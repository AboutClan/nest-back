import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import LogService from './log.service';

@ApiTags('log')
@Controller('log')
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get('score')
  async getScoreLog() {
    const logs = await this.logService.getLog('score');
    return logs;
  }

  @Get('monthScore')
  async getMonthScoreLog() {
    console.log(4);
    const logs = await this.logService.getMonthScoreLog();
    return logs;
  }

  @Get('score/all')
  async getAllScoreLog(@Query('scope') scope?: 'month') {
    const logs = await this.logService.getAllLog('score', scope);
    return logs;
  }

  @Get('point')
  async getPointLog() {
    const logs = await this.logService.getLog('point');
    return logs;
  }

  @Get('point/total')
  async getTotalPointLog() {
    const logs = await this.logService.getTotalPointLog();
    return logs;
  }

  @Get('point/coupon')
  async getPointCouponLog(@Query('scope') scope?: 'all') {
    const log = await this.logService.getCuoponLog('point', scope);
    if (log) return log;
    else return false;
  }

  @Get('point/all')
  async getAllPointLog() {
    const logs = await this.logService.getAllLog('point');
    return logs;
  }

  @Get('deposit')
  async getDepositLog() {
    const logs = await this.logService.getLog('deposit');
    return logs;
  }

  @Get('deposit/all')
  async getAllDepositLog() {
    const logs = await this.logService.getAllLog('deposit');
    return logs;
  }

  @Get('ticket/:category')
  async getTicketLog(@Param('category') category: string) {
    const logs = await this.logService.getTicketLog(category);
    return logs;
  }
}
