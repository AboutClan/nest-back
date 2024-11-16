import { IGroupStudyData } from './entity/groupStudy.entity';

export interface IGroupStudyService {
  getGroupStudySnapshot(): Promise<{
    online: IGroupStudyData[];
    offline: IGroupStudyData[];
  }>;
  getGroupStudyByFilterAndCategory(
    filter: string,
    category: string,
    cursor: number | null,
  ): Promise<IGroupStudyData[]>;
  getGroupStudyByFilter(
    filter: string,
    cursor: number | null,
  ): Promise<IGroupStudyData[]>;
  getGroupStudyByCategory(category: string): Promise<IGroupStudyData[]>;
  getGroupStudyById(groupStudyId: string): Promise<IGroupStudyData | null>;
  getUserParticipatingGroupStudy(): Promise<IGroupStudyData[]>;
  getGroupStudy(cursor: number | null): Promise<IGroupStudyData[]>;
  createSubComment(
    groupStudyId: string,
    commentId: string,
    content: string,
  ): Promise<void>;
  deleteSubComment(
    groupStudyId: string,
    commentId: string,
    subCommentId: string,
  ): Promise<void>;
  updateSubComment(
    groupStudyId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ): Promise<void>;
  createGroupStudy(data: IGroupStudyData): Promise<void>;
  updateGroupStudy(data: IGroupStudyData): Promise<void>;
  participateGroupStudy(id: string): Promise<void>;
  deleteParticipate(id: string): Promise<void>;
  exileParticipate(id: string, toUid: string, randomId?: number): Promise<void>;
  getWaitingPerson(id: string): Promise<IGroupStudyData | null>;
  setWaitingPerson(
    id: string,
    pointType: string,
    answer?: string,
  ): Promise<void>;
  agreeWaitingPerson(id: string, userId: string, status: string): Promise<void>;
  getAttendanceGroupStudy(id: string): Promise<any>;
  patchAttendanceWeek(id: string): Promise<void>;
  attendGroupStudy(
    id: string,
    weekRecord: string[],
    type: string,
    weekRecordSub?: string[],
  ): Promise<void>;
  createComment(groupStudyId: string, comment: string): Promise<void>;
  deleteComment(groupStudyId: string, commentId: string): Promise<void>;
  patchComment(
    groupStudyId: string,
    commentId: string,
    comment: string,
  ): Promise<void>;
  createCommentLike(groupStudyId: number, commentId: string): Promise<void>;
  createSubCommentLike(
    groupStudyId: number,
    commentId: string,
    subCommentId: string,
  ): Promise<void>;
  belongToParticipateGroupStudy(): Promise<any>;
  getSigningGroupByStatus(status: string): Promise<any>;
  getUserGroupsTitleByUserId(userId: string): Promise<string[]>;
}
