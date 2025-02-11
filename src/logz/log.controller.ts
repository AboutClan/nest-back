import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import LogService from './log.service';

@ApiTags('log')
@Controller('log')
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get('score')
  async getScoreLog() {
    try {
      const logs = await this.logService.getLog('score');
      return logs;
    } catch (err) {
      throw new HttpException(
        'Error fetching score logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('monthScore')
  async getMonthScoreLog() {
    try {
      const logs = await this.logService.getMonthScoreLog();
      return logs;
    } catch (err) {
      throw new HttpException(
        'Error fetching month score logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('score/all')
  async getAllScoreLog() {
    try {
      const logs = await this.logService.getAllLog('score');
      return logs;
    } catch (err) {
      throw new HttpException(
        'Error fetching all score logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('point')
  async getPointLog() {
    try {
      const logs = await this.logService.getLog('point');
      return logs;
    } catch (err) {
      throw new HttpException(
        'Error fetching point logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('point/all')
  async getAllPointLog() {
    try {
      const logs = await this.logService.getAllLog('point');
      return logs;
    } catch (err) {
      throw new HttpException(
        'Error fetching all point logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('deposit')
  async getDepositLog() {
    try {
      const logs = await this.logService.getLog('deposit');
      return logs;
    } catch (err) {
      throw new HttpException(
        'Error fetching deposit logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('deposit/all')
  async getAllDepositLog() {
    try {
      const logs = await this.logService.getAllLog('deposit');
      return logs;
    } catch (err) {
      throw new HttpException(
        'Error fetching all deposit logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
