import { UpdateWriteOpResult } from 'mongoose';
import { IGroupStudyData, subCommentType } from './groupStudy.entity';

export interface GroupStudyRepository {
  findWithQueryPopPage(filterQuery: any, start?: number, gap?: number);
  // findWithQuery(filterQuery: any);
  findById(groupStudyId: string): Promise<IGroupStudyData>;
  findByIdWithWaiting(groupStudyId: string): Promise<IGroupStudyData>;
  findByIdWithPop(groupStudyId: number): Promise<IGroupStudyData>;
  addParticipantWithAttendance(
    id: string,
    userId: string,
    userName: string,
    userUid: string,
  ): Promise<IGroupStudyData>;
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
  getUserGroupsTitleByUserId(userId: string): Promise<string[]>;
  getSigningGroupByStatus(userId: string, status: string): Promise<any>;
  weekAttendance(groupId: string, id: string): Promise<UpdateWriteOpResult>;
  initWeekAttendance(): Promise<void>;
  findEnthMembers();
  findMyGroupStudyId(userId: string);
  findMyGroupStudyComment(userId: string);
  test();
}
