import { IGroupStudyData } from './entity/groupStudy.entity';

export interface GroupStudyRepository {
  findByStatusAndCategory(
    filterQuery: any,
    start: number,
    gap: number,
  ): Promise<IGroupStudyData[]>;
  findByCategory(category: string): Promise<IGroupStudyData[]>;
  findById(groupStudyId: string): Promise<IGroupStudyData>;
  findByParticipant(userId: string): Promise<IGroupStudyData[]>;
  findAllFilter(start: number, gap: number): Promise<IGroupStudyData[]>;
  createSubComment(
    groupStudyId: string,
    commentId: string,
    message: string,
  ): Promise<null>;
  deleteSubComment(
    groupStudyId: string,
    commentId: string,
    subCommentId: string,
  ): Promise<null>;
  updateSubComment(
    groupStudyId: string,
    commentId: string,
    subCommentId: string,
    message: string,
  ): Promise<null>;
  createGroupStudy(
    groupStudyData: Partial<IGroupStudyData>,
  ): Promise<IGroupStudyData>;
  findById(groupStudyId: string): Promise<IGroupStudyData>;
  createCommentLike(
    groupStudyId: string,
    commentId: string,
    userId: string,
  ): Promise<IGroupStudyData>;
  createSubCommentLike(
    groupStudyId: string,
    commentId: string,
    subCommentId: string,
    userId: string,
  ): Promise<IGroupStudyData>;
  findAll(): Promise<IGroupStudyData[]>;
}
