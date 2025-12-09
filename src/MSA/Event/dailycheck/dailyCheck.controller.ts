import { Controller, Get, Injectable, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { DailyCheckService } from './dailyCheck.service';

@Injectable()
@ApiTags('dailyCheck')
@Controller('dailyCheck')
export class DailyCheckController {
  constructor(private readonly dailyCheckServiceInstance: DailyCheckService) {}

  @Get()
  async getLog(@Res() res: Response) {
    const users = await this.dailyCheckServiceInstance.getLog();
    return res.status(200).json(users);
  }

  @Post()
  async setDailyCheck(@Res() res: Response) {
    const result = await this.dailyCheckServiceInstance.setDailyCheck();
    if (result) return res.status(200).json(result);
    return res.status(400).end();
  }

  @Get('/all')
  async getAllLog(@Res() res: Response) {
    const users = await this.dailyCheckServiceInstance.getAllLog();
    return res.status(200).json(users);
  }
}
