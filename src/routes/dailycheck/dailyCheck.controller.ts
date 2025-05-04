import { Controller, Get, Post, Res, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { DailyCheckService } from './dailyCheck.service';
import { ApiTags } from '@nestjs/swagger';

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
    if (result) return res.status(400).json({ message: result });
    return res.status(200).end();
  }

  @Get('/all')
  async getAllLog(@Res() res: Response) {
    const users = await this.dailyCheckServiceInstance.getAllLog();
    return res.status(200).json(users);
  }
}
