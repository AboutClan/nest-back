import { IMember, IParticipation, IResult } from './vote2.entity';

export interface IVote2Repository {
  setVote(date: Date, userVoteData: IParticipation);
  deleteVote(date: Date, userId: string);
  setVoteResult(date: Date, result: IResult[]);
  findParticipationsByDate(date: Date);
  setArrive(date: Date, userId: string, memo: any);
  setParticipate(date: Date, placeId, participateData: Partial<IMember>);
}
