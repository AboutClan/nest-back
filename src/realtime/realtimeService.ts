import { IRealtime, IRealtimeUser } from './realtime.entity';

export interface IRealtimeService {
  getToday(): Date;
  getTodayData(): Promise<IRealtime>;
  createBasicVote(studyData: Partial<IRealtime>): Promise<IRealtime>;
  markAttendance(
    studyData: Partial<IRealtimeUser>,
    buffers: Buffer[],
  ): Promise<any>;
  updateStudy(studyData: Partial<IRealtime>): Promise<IRealtime>;
  patchVote(start: any, end: any): Promise<any>;
  deleteVote(): Promise<void>;
  patchStatus(status: any): Promise<void>;
  patchComment(comment: string): Promise<void>;
  getRecentStudy(): Promise<IRealtime>;
}
