import { IParticipation } from './vote2.entity';

export interface IVote2Repository {
  setVote(date: Date, userVoteData: IParticipation);
  findParticipationsByDate(date: Date);
}
