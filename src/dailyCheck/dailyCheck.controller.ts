import {
  Controller,
  Get,
  Post,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { DailyCheckService } from './dailyCheck.service';

@Controller('daily-check')
export class DailyCheckController {
  constructor(private readonly dailyCheckService: DailyCheckService) {}

  @Get()
  async getLog() {
    try {
      const users = await this.dailyCheckService.getLog();
      return users;
    } catch (err) {
      throw new HttpException(
        'Error fetching logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async setDailyCheck() {
    try {
      const result = await this.dailyCheckService.setDailyCheck();
      if (result) {
        throw new HttpException(result, HttpStatus.BAD_REQUEST);
      }
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error setting daily check',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('all')
  async getAllLog() {
    try {
      const users = await this.dailyCheckService.getAllLog();
      return users;
    } catch (err) {
      throw new HttpException(
        'Error fetching all logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
