import { IParticipation, IResult } from './vote2.entity';

export interface IVote2Repository {
  setVote(date: Date, userVoteData: IParticipation);
  setVoteResult(date: Date, result: IResult[]);
  findParticipationsByDate(date: Date);
}
