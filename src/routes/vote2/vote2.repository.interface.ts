import { IMember, IParticipation, IResult, IVote2 } from './vote2.entity';

export interface IVote2Repository {
  getVoteByPeriod(startDay: Date, endDay: Date): Promise<IVote2[]>;
  setVote(date: string, userVoteData: IParticipation);
  deleteVote(date: string, userId: string);
  setVoteResult(date: string, result: IResult[]);
  findParticipationsByDate(date: string);
  findParticipationsByDateJoin(date: string);
  setArrive(date: string, userId: string, memo: any);
  setParticipate(date: string, placeId, participateData: Partial<IMember>);
  findByDate(date: string);
  setAbsence(date: string, message: string, userId: string, fee: number);
  setComment(date: string, userId, comment: string);
  updateResult(date: string, userId: string, start: string, end: string);
}
