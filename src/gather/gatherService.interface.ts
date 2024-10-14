import { gatherStatus, IGatherData } from './entity/gather.entity';

export interface IGatherService {
  getNextSequence(name: string): Promise<number | undefined>;
  getGatherById(gatherId: number): Promise<IGatherData | null>;
  getThreeGather(): Promise<IGatherData[]>;
  getGather(cursor: number | null): Promise<IGatherData[]>;
  createGather(data: Partial<IGatherData>): Promise<void>;
  updateGather(gather: IGatherData): Promise<void>;
  participateGather(
    gatherId: string,
    phase: string,
    userId?: string,
  ): Promise<void>;
  deleteParticipate(gatherId: string): Promise<void>;
  setStatus(gatherId: string, status: gatherStatus): Promise<void>;
  setWaitingPerson(id: string, phase: 'first' | 'second'): Promise<void>;
  handleWaitingPerson(
    id: string,
    userId: string,
    status: string,
    text?: string,
  ): Promise<void>;
  createSubComment(
    gatherId: string,
    commentId: string,
    content: string,
  ): Promise<void>;
  deleteSubComment(
    gatherId: string,
    commentId: string,
    subCommentId: string,
  ): Promise<void>;
  updateSubComment(
    gatherId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ): Promise<void>;
  createComment(gatherId: string, comment: string): Promise<void>;
  deleteComment(gatherId: string, commentId: string): Promise<void>;
  patchComment(
    gatherId: string,
    commentId: string,
    comment: string,
  ): Promise<void>;
  createCommentLike(gatherId: number, commentId: string): Promise<void>;
  createSubCommentLike(
    gatherId: string,
    commentId: string,
    subCommentId: string,
  ): Promise<void>;
  deleteGather(gatherId: string): Promise<void>;
}
