import { UpdateWriteOpResult } from 'mongoose';
import { IGatherData, participantsType, subCommentType } from './gather.entity';

export interface GatherRepository {
  findById(gatherId: string): Promise<IGatherData>;
  findByIdPop(gatherId: number): Promise<IGatherData>;
  findThree(): Promise<IGatherData[]>;
  findAll(start: number, gap: number): Promise<IGatherData[]>;
  createGather(gatherData: Partial<IGatherData>): Promise<IGatherData>;
  updateGather(
    gatherId: number,
    gatherData: Partial<IGatherData>,
  ): Promise<null>;
  deleteParticipants(gatherId: number, userId: string): Promise<IGatherData>;
  createSubComment(
    gatherId: string,
    commentId: string,
    message: subCommentType,
  ): Promise<IGatherData>;
  deleteSubComment(
    gatherId: string,
    commentId: string,
    subCommentId: string,
  ): Promise<null>;
  updateSubComment(
    gatherId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ): Promise<null>;
  createComment(
    gatherId: string,
    userId: string,
    message: string,
  ): Promise<IGatherData>;
  deleteComment(gatherId: string, commentId: string): Promise<null>;
  updateComment(
    gatherId: string,
    commentId: string,
    comment: string,
  ): Promise<null>;
  createCommentLike(
    gatherId: number,
    commentId: string,
    userId: string,
  ): Promise<IGatherData>;
  createSubCommentLike(
    gatherId: string,
    commentId: string,
    subCommentId: string,
    userId: string,
  ): Promise<null>;
  deleteById(gatherId: string): Promise<any>;
  getEnthMembers();
  deleteWaiting(gatherId: string, userId: string);
  updateNotOpened(current: Date);
  findMyStatusGather(
    userId: string,
    status: string,
    start: number,
    gap: number,
  );
  findMyGather(userId: string, start: number, gap: number);
  participate(gatherId: number, participateData: participantsType);
  findMyGatherId(userId: string);
  exileUser(gatherId: number, userId: string);
}
