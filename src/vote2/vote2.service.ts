import { Inject } from '@nestjs/common';
import { CreateNewVoteDTO } from './vote2.dto';
import { IVote2Service } from './vote2.service.interface';
import { REQUEST } from '@nestjs/core';
import { JWT } from 'next-auth/jwt';
import { Request } from 'express';
import { IVote2Repository } from './vote2.repository.interface';
import { IVOTE2_REPOSITORY } from 'src/utils/di.tokens';
import { IParticipation } from './vote2.entity';

export class Vote2Service implements IVote2Service {
  private token: JWT;

  constructor(
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
    @Inject(IVOTE2_REPOSITORY)
    private readonly Vote2Repository: IVote2Repository,
  ) {
    this.token = this.request.decodedToken;
  }

  setVote(date: Date, createVote: CreateNewVoteDTO) {
    const { latitude, longitude, start, end } = createVote;

    const userVoteData: IParticipation = {
      userId: this.token.id,
      latitude,
      longitude,
      start,
      end,
    };

    this.Vote2Repository.setVote(date, userVoteData);
  }

  setResult(date: Date) {
    const participations = this.Vote2Repository.findParticipationsByDate(date);
  }
}
