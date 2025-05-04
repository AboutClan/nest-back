import { Gather } from 'src/domain/entities/Gather/Gather';
import { IGatherData } from './gather.entity';

export interface IGatherRepository {
  findMyGatherId(userId: string);
  findById(id: number, pop?: boolean): Promise<Gather | null>;
  findThree(): Promise<Gather[] | null>;
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
  deleteById(gatherId: string): Promise<any>;
  getEnthMembers();
}
