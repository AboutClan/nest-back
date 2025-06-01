import { GroupStudy } from 'src/domain/entities/GroupStudy';

export interface IGroupStudyRepository {
  findWithQueryPopPage(
    filterQuery: any,
    start?: number,
    gap?: number,
  ): Promise<GroupStudy[]>;

  getUserGroupsTitleByUserId(userId: string): Promise<any>;
  getSigningGroupByStatus(userId: string, status: string): Promise<any>;
  findByIdWithPop(groupStudyId: number): Promise<GroupStudy | null>;
  findAll(): Promise<GroupStudy[]>;
  findById(groupStudyId: string): Promise<GroupStudy | null>;
  initWeekAttendance(): Promise<void>;
  findMyGroupStudyComment(userId: string): Promise<any[]>;
  save(entity: GroupStudy): Promise<GroupStudy>;
}
