import { Feed } from '../domain/feed/Feed';

export interface IFeedRepository {
  findByType(type: string, opt: any): Promise<Feed[]>;
  findById(id: string): Promise<Feed>;
  findByGroupIds(groupIds: string[]): Promise<Feed[]>;
  findByIdJoin(id: string): Promise<Feed>;
  findAll(opt: any): Promise<Feed[]>;
  findAllTemp();
  create(doc: Feed): Promise<Feed>;
  save(doc: Feed): Promise<Feed>;
  findMyFeed(userId: string, isPopulate: boolean): Promise<Feed[]>;
  findRecievedFeed(idArr: string[], isPopulate: boolean): Promise<Feed[]>;
}
