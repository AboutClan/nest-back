import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import { CreateNewVoteDTO } from './vote2.dto';
import { Request } from 'express';
import { IVOTE2_SERVICE } from 'src/utils/di.tokens';
import { IVote2Service } from './vote2.service.interface';

@Controller('vote2')
export class Vote2Controller {
  constructor(@Inject(IVOTE2_SERVICE) private voteService2: IVote2Service) {}

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
