import { IParticipation, IVote } from './vote.entity';

export interface VoteRepository {
  findByDatePlaceAttAbs(date: Date): Promise<IVote>;
  aggregateArrivedPeriod(startDay: string, endDay: string): Promise<any[]>;
  create(date: Date, participants: IParticipation[]): Promise<IVote>;
  isExist(date: Date, userId: string): Promise<any>;
  deleteUser(date: Date, uid: string): Promise<null>;
  patchComment(date: Date, userId: string, comment: string): Promise<IVote>;
  patchVote(
    date: Date,
    userId: string,
    start: string,
    end: string,
  ): Promise<IVote>;
  deleteVote(date: Date, userId: string): Promise<null>;
  findAbsence(date: Date): Promise<IVote>;
  createAbsence(date: Date, userId: string, message: string): Promise<any>;
  findVoteWithAttPlace(date: Date): Promise<IVote>;
  patchConfirm(date: Date, userId: string): Promise<any>;
  patchDismiss(date: Date, userId: string): Promise<any>;
  aggregateStart(date: Date): Promise<any>;
  patchFree(date: Date, placeId: string): Promise<any>;
  aggregateArriveCheck(startDay: string, endDay: string): Promise<any[]>;
}
