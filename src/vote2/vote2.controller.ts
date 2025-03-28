import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  CreateArriveDTO,
  CreateNewVoteDTO,
  CreateParticipateDTO,
} from './vote2.dto';
import { Request } from 'express';
import { IVOTE2_SERVICE } from 'src/utils/di.tokens';
import { Vote2Service } from './vote2.service';

@Controller('vote2')
export class Vote2Controller {
  constructor(private readonly voteService2: Vote2Service) {}

  @Get('test')
  async test() {
    await this.voteService2.setResult(new Date());
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

  @Post(':date/arrive')
  async setArrive(
    @Req() req: Request,
    @Body() arriveData: CreateArriveDTO,
  ): Promise<any> {
    const { date } = req;
    const { memo } = arriveData;
    await this.voteService2.setArrive(date, memo);

    return 'success';
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
    @Body() body: { message: string },
  ): Promise<any> {
    const { message = '' } = body; // message 값, 기본값 설정
    const { date } = req; // 미들웨어에서 설정된 date 값 가져오기

    const result = await this.voteService2.setAbsence(date, message);
    return result;
  }
}
