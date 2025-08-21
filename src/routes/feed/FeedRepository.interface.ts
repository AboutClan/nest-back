import { Feed } from 'src/domain/entities/Feed/Feed';

export interface IFeedRepository {
  findByType(type: string, opt: any): Promise<Feed[]>;
  findById(id: string): Promise<Feed>;
  findByIdJoin(id: string): Promise<Feed>;
  findAll(opt: any): Promise<Feed[]>;
  findAllTemp();
  create(doc: Feed): Promise<Feed>;
  save(doc: Feed): Promise<Feed>;
  findMyFeed(feedType: string, userId: string): Promise<Feed[]>;
  findRecievedFeed(feedType: string, idArr: string[]): Promise<Feed[]>;
}
