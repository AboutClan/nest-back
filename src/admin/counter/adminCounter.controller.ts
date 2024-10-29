import { Controller, Get, Post, Query, Body, Res, Next } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { CounterService } from 'src/counter/counter.service';

@Controller('admin/counter')
export class AdminCounterController {
  constructor(private readonly counterService: CounterService) {}

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
