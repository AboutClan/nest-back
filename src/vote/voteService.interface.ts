import { IVote, IVoteStudyInfo } from './entity/vote.entity';

export interface IVoteService {
  findOneVote(date: Date): Promise<IVote | null>;
  getArrivedPeriod(startDay: string, endDay: string): Promise<any>;
  getVote(date: any): Promise<IVote>;
  isVoting(date: any): Promise<boolean>;
  getFilteredVote(date: any, location: string): Promise<any>;
  getWeekDates(date: any): Promise<Date[]>;
  getRangeDates(startDay: any, endDay: any): Promise<Date[]>;
  getParticipantsCnt(
    location: string,
    startDay: any,
    endDay: any,
  ): Promise<any>;
  getFilteredVoteByDate(date: any, location: string): Promise<any>;
  setVote(date: any, studyInfo: IVoteStudyInfo): Promise<void>;
  setNewVote(date: any, studyInfo: IVoteStudyInfo): Promise<void>;
  patchComment(date: any, comment: string): Promise<void>;
  patchVote(date: any, start: any, end: any): Promise<IVote | null>;
  deleteVote(date: any): Promise<void>;
  getAbsence(date: any): Promise<any>;
  setAbsence(date: any, message: string): Promise<void>;
  getArrived(date: any): Promise<any>;
  patchArrive(date: any, memo: any, endHour: any): Promise<any>;
  patchConfirm(date: any): Promise<boolean>;
  patchDismiss(date: any): Promise<boolean>;
  getStart(date: any): Promise<any>;
  quickVote(
    date: any,
    studyInfo: Omit<IVoteStudyInfo, 'place' | 'subPlace'>,
  ): Promise<boolean>;
  setFree(date: any, placeId: any): Promise<boolean>;
  getArriveCheckCnt(): Promise<any>;
  getFilteredVoteOne(date: any): Promise<any>;
}
