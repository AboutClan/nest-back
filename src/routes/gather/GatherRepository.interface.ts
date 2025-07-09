import { Gather } from 'src/domain/entities/Gather/Gather';
import { IGatherData } from './gather.entity';

export interface IGatherRepository {
  findMyGather(userId: string): Promise<Gather[] | null>;
  findMyGatherId(userId: string);
  findById(id: number, pop?: boolean): Promise<Gather | null>;
  findThree(): Promise<Gather[] | null>;
  findByPeriod(firstDay: Date, secondDay: Date): Promise<Gather[] | null>;
  findByGroupId(groupId, type): Promise<Gather[] | null>;
  createGather(gatherData: Partial<Gather>): Promise<Gather>;
  findWithQueryPop(
    query: any,
    start?: number,
    gap?: number,
    sortBy?: string,
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
