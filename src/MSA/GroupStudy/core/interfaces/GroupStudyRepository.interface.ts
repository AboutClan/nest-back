import { GroupStudy } from 'src/MSA/GroupStudy/core/domain/GroupStudy';
import { IGroupStudyData } from '../../entity/groupStudy.entity';

export interface IGroupStudyRepository {
  findWithQueryPopPage(
    filterQuery: any,
    start?: number,
    gap?: number,
  ): Promise<GroupStudy[]>;
  findByGroupId(groupId: string): Promise<GroupStudy[] | null>;
  findMyGroupStudyId(userId: string);
  findEnthMembers();
  getUserGroupsTitleByUserId(userId: string): Promise<any>;
  getSigningGroupByStatus(userId: string, status: string): Promise<any>;
  findByIdWithPop(groupStudyId: number): Promise<GroupStudy | null>;
  findAll(): Promise<GroupStudy[]>;
  findAllTemp();
  findById(groupStudyId: string): Promise<GroupStudy | null>;
  findBy_Id(groupStudyId: string): Promise<GroupStudy | null>;
  initWeekAttendance(): Promise<void>;
  findMyGroupStudyComment(userId: string): Promise<any[]>;
  save(entity: GroupStudy): Promise<GroupStudy>;
  create(entity: GroupStudy): Promise<GroupStudy>;
  findByIdWithWaiting(groupStudyId: string): Promise<GroupStudy | null>;
  findAllForLLM(): Promise<Partial<IGroupStudyData>[]>;
  test();
}
