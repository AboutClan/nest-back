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
import { CONST } from 'src/Constants/CONSTANTS';
import {
  CreateArriveDTO,
  CreateNewVoteDTO,
  CreateNewVotesDTO,
  CreateParticipateDTO,
} from './vote2.dto';
import { Vote2Service } from './vote2.service';

@Controller('vote2')
export class Vote2Controller {
  constructor(private readonly voteService2: Vote2Service) {}

  @Get('week')
  async getWeekData(@Req() req: Request): Promise<any> {
    const filteredVote = await this.voteService2.getWeekData();
    return filteredVote;
  }

  @Get(':date/info')
  async getVoteInfo(@Req() req: Request): Promise<any> {
    const { date } = req;
    const filteredVote = await this.voteService2.getVoteInfo(date as string);
    return filteredVote;
  }

  @Get(':date/one')
  async getFilteredVoteByDateOne(@Req() req: Request): Promise<any> {
    const { date } = req;

    const filteredVote = await this.voteService2.getFilteredVoteOne(
      date as string,
    );

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

    await this.voteService2.deleteVote(date as string);

    return 'success';
  }

  @Post(':date')
  async setVote(
    @Req() req: Request,
    @Body() createVoteDTO: CreateNewVoteDTO,
  ): Promise<any> {
    const { latitude, longitude, start, end, locationDetail } = createVoteDTO;
    const { date } = req;

    await this.voteService2.setVote(date as string, {
      latitude,
      longitude,
      start,
      end,
      locationDetail,
    });

    return { value: CONST.POINT.STUDY_VOTE };
  }

  @Post(':date/dateArr')
  async setVoteArr(
    @Req() req: Request,
    @Body() createVoteDTO: CreateNewVotesDTO,
  ): Promise<any> {
    const { latitude, longitude, start, end, dates, locationDetail } =
      createVoteDTO;

    await this.voteService2.setVoteWithArr(dates, {
      latitude,
      longitude,
      start,
      end,
      locationDetail,
    });

    return null;
  }

  @Patch(':date')
  async patchVote(
    @Req() req: Request,
    @Body() createVoteDTO: CreateNewVoteDTO,
  ): Promise<any> {
    const { latitude, longitude, start, end, locationDetail } = createVoteDTO;
    const { date } = req;

    await this.voteService2.setVote(date as string, {
      latitude,
      longitude,
      start,
      end,
      locationDetail,
    });

    return 'success';
  }

  @Post(':date/comment')
  async setComment(
    @Req() req: Request,
    @Body('comment') comment: string,
  ): Promise<any> {
    const { date } = req;

    await this.voteService2.setComment(date as string, comment);

    return 'success';
  }

  @Post(':date/participate')
  async setAttend(
    @Req() req: Request,
    @Body() createParticipateDTO: CreateParticipateDTO,
  ): Promise<any> {
    const { start, end, placeId } = createParticipateDTO;
    const { date } = req;

    await this.voteService2.setParticipate(date as string, {
      start,
      end,
      placeId,
    });

    return 'success';
  }

  @Post(':date/result')
  async setResult(@Req() req: Request): Promise<any> {
    const { date } = req;
    await this.voteService2.setResult(date as string);

    return 'success';
  }

  @Patch(':date/result')
  async updateResult(
    @Req() req: Request,
    @Body('start') start: string,
    @Body('end') end: string,
  ): Promise<any> {
    const { date } = req;
    await this.voteService2.updateResult(date as string, start, end);

    return 'success';
  }

  @Post(':date/arrive')
  async setArrive(
    @Req() req: Request,
    @Body() body: CreateArriveDTO,
  ): Promise<any> {
    const { date } = req;
    const { memo, end } = body;
    const result = await this.voteService2.setArrive(date as string, memo, end);

    return result;
  }

  @Get(':date/absence')
  async segetAbsence(@Req() req: Request): Promise<any> {
    const { date } = req; // 미들웨어에서 설정된 date 값 가져오기

    const result = await this.voteService2.getAbsence(date as string);
    return result;
  }

  @Post(':date/absence')
  async setAbsence(
    @Req() req: Request,
    @Body() body: { message: string; fee: number },
  ): Promise<any> {
    const { message = '', fee } = body; // message 값, 기본값 설정
    const { date } = req; // 미들웨어에서 설정된 date 값 가져오기

    const result = await this.voteService2.setAbsence(
      date as string,
      message,
      fee,
    );
    return result;
  }
}
