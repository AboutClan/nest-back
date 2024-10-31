import { IGatherData } from './entity/gather.entity';

export interface GatherRepository {
  findById(gatherId: number): Promise<IGatherData>;
  findThree(): Promise<IGatherData[]>;
  findAll(start: number, gap: number): Promise<IGatherData[]>;
  createGather(gatherData: Partial<IGatherData>): Promise<IGatherData>;
  updateGather(
    gatherId: number,
    gatherData: Partial<IGatherData>,
  ): Promise<null>;
  deleteParticipants(gatherId: number, userId: string): Promise<null>;
  createSubComment(
    gatherId: string,
    commentId: string,
    message: string,
  ): Promise<null>;
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
  createComment(gatherId: string, message: string): Promise<null>;
  deleteComment(gatherId: string, commentId: string): Promise<null>;
  updateComment(
    gatherId: string,
    commentId: string,
    comment: string,
  ): Promise<null>;
  createCommentLike(
    gatherId: string,
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
}
