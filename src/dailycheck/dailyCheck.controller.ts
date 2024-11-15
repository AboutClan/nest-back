import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  Next,
  Injectable,
  Inject,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { IDAILYCHECK_SERVICE } from 'src/utils/di.tokens';
import { DailyCheckService } from './dailyCheck.service';

@Injectable()
@Controller('dailyCheck')
export class DailyCheckController {
  constructor(
    @Inject(IDAILYCHECK_SERVICE)
    private dailyCheckServiceInstance: DailyCheckService,
  ) {}

  @Get()
  async getLog(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const users = await this.dailyCheckServiceInstance.getLog();
      return res.status(200).json(users);
    } catch (err) {
      next(err);
    }
  }

  @Post()
  async setDailyCheck(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const result = await this.dailyCheckServiceInstance.setDailyCheck();
      if (result) return res.status(400).json({ message: result });
      return res.status(200).end();
    } catch (err) {
      next(err);
    }
  }

  @Get('/all')
  async getAllLog(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const users = await this.dailyCheckServiceInstance.getAllLog();
      return res.status(200).json(users);
    } catch (err) {
      next(err);
    }
  }
}
