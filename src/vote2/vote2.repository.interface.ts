import { IMember, IParticipation, IResult, IVote2 } from './vote2.entity';

export interface IVote2Repository {
  getVoteByPeriod(startDay: string, endDay: string): Promise<IVote2[]>;
  setVote(date: Date, userVoteData: IParticipation);
  deleteVote(date: Date, userId: string);
  setVoteResult(date: Date, result: IResult[]);
  findParticipationsByDate(date: Date);
  findParticipationsByDateJoin(date: Date);
  setArrive(date: Date, userId: string, memo: any);
  setParticipate(date: Date, placeId, participateData: Partial<IMember>);
  findByDate(date: Date);
  setAbsence(date: Date, message: string, userId: string);
  setComment(date: Date, userId, comment: string);
}
