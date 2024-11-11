import { IGroupStudyData, subCommentType } from './entity/groupStudy.entity';

export interface GroupStudyRepository {
  findByStatusAndCategory(
    filterQuery: any,
    start: number,
    gap: number,
  ): Promise<IGroupStudyData[]>;
  findByCategory(category: string): Promise<IGroupStudyData[]>;
  findById(groupStudyId: string): Promise<IGroupStudyData>;
  findByIdWithWaiting(groupStudyId: string): Promise<IGroupStudyData>;
  findByIdWithPop(groupStudyId: number): Promise<IGroupStudyData>;
  findByParticipant(userId: string): Promise<IGroupStudyData[]>;
  addParticipantWithAttendance(
    id: string,
    userId: string,
    userName: string,
    userUid: string,
  ): Promise<IGroupStudyData>;
  findAllFilter(start: number, gap: number): Promise<IGroupStudyData[]>;
  createSubComment(
    groupStudyId: string,
    commentId: string,
    message: subCommentType,
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
  createCommentLike(
    groupStudyId: number,
    commentId: string,
    userId: string,
  ): Promise<IGroupStudyData>;
  createSubCommentLike(
    groupStudyId: number,
    commentId: string,
    subCommentId: string,
    userId: string,
  ): Promise<IGroupStudyData>;
  findAll(): Promise<IGroupStudyData[]>;
  getSigningGroup(userId: string, field: string | null): Promise<any>;
  getSigningGroupByStatus(userId: string, status: string): Promise<any>;
}
