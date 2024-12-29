import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import { CreateNewVoteDTO } from './vote2.dto';
import { Request } from 'express';

@Controller('vote2')
export class Vote2Controller {
  constructor(@Inject(IVOTE_SERVICE2) private voteService2: IVoteService2) {}

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
}
