import { Types } from 'mongoose';
import { Gather } from '../domain/Gather/Gather';
import { IGatherData } from '../../entity/gather.entity';
export interface IGatherRepository {
  findMyGather(userId: string, isPopulate?: boolean): Promise<Gather[] | null>;
  findMyGatherId(userId: string);
  findById(id: number, pop?: boolean): Promise<Gather | null>;
  findAllTemp();
  findThree(): Promise<Gather[] | null>;
  findByPeriod(firstDay: Date, secondDay: Date): Promise<Gather[] | null>;
  findByGroupId(groupId, type): Promise<Gather[] | null>;
  findGroupActivity(
    groupId: string,
    memberIds: string[],
    month: 'this' | 'last',
  ): Promise<{
    month: {
      _id: Types.ObjectId;
      gatherCount: number;
    }[];
    total: {
      _id: Types.ObjectId;
      gatherCount: number;
    }[];
  } | null>;
  createGather(gatherData: Partial<Gather>): Promise<Gather>;
  findWithQueryPop(
    query: any,
    cursor?: number,
    sortBy?: any,
    isFull?: boolean,
  ): Promise<Gather[] | null>;
  updateGather(
    gatherId: number,
    gatherData: Partial<IGatherData>,
  ): Promise<null>;
  save(doc: Gather): Promise<Gather>;
  updateNotOpened(current: Date);
  deleteById(gatherId: number): Promise<any>;
  getEnthMembers();
}
