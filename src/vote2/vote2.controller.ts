import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  CreateArriveDTO,
  CreateNewVoteDTO,
  CreateParticipateDTO,
} from './vote2.dto';
import { Vote2Service } from './vote2.service';

@Controller('vote2')
export class Vote2Controller {
  constructor(private readonly voteService2: Vote2Service) {}

  @Get('test')
  async test() {
    await this.voteService2.setResult(new Date());
  }

  @Get(':date/info')
  async getVoteInfo(@Req() req: Request): Promise<any> {
    const { date } = req;
    const filteredVote = await this.voteService2.getVoteInfo(date);
    return filteredVote;
  }

  @Get(':date/one')
  async getFilteredVoteByDateOne(@Req() req: Request): Promise<any> {
    const { date } = req;

    const filteredVote = await this.voteService2.getFilteredVoteOne(date);

    return filteredVote;
  }

  @Get('arrived')
  async getArrived(
    @Query('startDay') startDay: string,
    @Query('endDay') endDay: string,
  ) {
    const results = await this.voteService2.getArrivedPeriod(startDay, endDay);
    return results;
  }

  @Delete(':date')
  async deleteVote(@Req() req: Request): Promise<any> {
    const { date } = req;

    await this.voteService2.deleteVote(date);

    return 'success';
  }

  @Post(':date')
  async setVote(
    @Req() req: Request,
    @Body() createVoteDTO: CreateNewVoteDTO,
  ): Promise<any> {
    const { latitude, longitude, start, end } = createVoteDTO;
    const { date } = req;

    await this.voteService2.setVote(date, {
      latitude,
      longitude,
      start,
      end,
    });

    return 'success';
  }

  @Patch(':date')
  async patchVote(
    @Req() req: Request,
    @Body() createVoteDTO: CreateNewVoteDTO,
  ): Promise<any> {
    const { latitude, longitude, start, end } = createVoteDTO;
    const { date } = req;

    await this.voteService2.setVote(date, {
      latitude,
      longitude,
      start,
      end,
    });

    return 'success';
  }

  @Post(':date/comment')
  async setComment(
    @Req() req: Request,
    @Body('comment') comment: string,
  ): Promise<any> {
    const { date } = req;

    await this.voteService2.setComment(date, comment);

    return 'success';
  }

  @Post(':date/participate')
  async setAttend(
    @Req() req: Request,
    @Body() createParticipateDTO: CreateParticipateDTO,
  ): Promise<any> {
    const { start, end, placeId } = createParticipateDTO;
    const { date } = req;

    await this.voteService2.setParticipate(date, {
      start,
      end,
      placeId,
    });

    return 'success';
  }

  @Post(':date/result')
  async setResult(@Req() req: Request): Promise<any> {
    const { date } = req;
    await this.voteService2.setResult(date);

    return 'success';
  }

  @Patch(':date/result')
  async updateResult(
    @Req() req: Request,
    @Body('start') start: string,
    @Body('end') end: string,
  ): Promise<any> {
    const { date } = req;
    await this.voteService2.updateResult(date, start, end);

    return 'success';
  }

  @Post(':date/arrive')
  async setArrive(
    @Req() req: Request,
    @Body() body: CreateArriveDTO,
  ): Promise<any> {
    const { date } = req;
    const { memo, end } = body;
    const result = await this.voteService2.setArrive(date, memo, end);

    return result;
  }

  @Get(':date/absence')
  async segetAbsence(@Req() req: Request): Promise<any> {
    const { date } = req; // 미들웨어에서 설정된 date 값 가져오기

    const result = await this.voteService2.getAbsence(date);
    return result;
  }

  @Post(':date/absence')
  async setAbsence(
    @Req() req: Request,
    @Body() body: { message: string; fee: number },
  ): Promise<any> {
    const { message = '', fee } = body; // message 값, 기본값 설정
    const { date } = req; // 미들웨어에서 설정된 date 값 가져오기

    const result = await this.voteService2.setAbsence(date, message, fee);
    return result;
  }
}
