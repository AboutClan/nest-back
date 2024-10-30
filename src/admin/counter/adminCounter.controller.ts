import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  Next,
  Inject,
} from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { CounterService } from 'src/counter/counter.service';
import { ICounterService } from 'src/counter/counterService.interface';
import { ICOUNTER_SERVICE } from 'src/utils/di.tokens';

@Controller('admin/counter')
export class AdminCounterController {
  constructor(
    @Inject(ICOUNTER_SERVICE) private counterService: ICounterService,
  ) {}

  @Get('/')
  async getCounter(
    @Query('key') key: string,
    @Query('location') location: string,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const counter = await this.counterService.getCounter(key, location);
      return res.status(200).json(counter);
    } catch (err) {
      next(err);
    }
  }

  @Post('/')
  async setCounter(
    @Body('key') key: string,
    @Body('location') location: string,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const data = await this.counterService.setCounter(key, location);
      return res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
}
