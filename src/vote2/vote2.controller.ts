import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  CreateArriveDTO,
  CreateNewVoteDTO,
  CreateParticipateDTO,
} from './vote2.dto';
import { Request } from 'express';
import { IVOTE2_SERVICE } from 'src/utils/di.tokens';
import { IVote2Service } from './vote2.service.interface';

@Controller('vote2')
export class Vote2Controller {
  constructor(@Inject(IVOTE2_SERVICE) private voteService2: IVote2Service) {}

  @Get('test')
  async test() {
    await this.voteService2.setResult(new Date());
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
}
