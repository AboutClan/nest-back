import { Feed } from 'src/domain/entities/Feed/Feed';

export interface IFeedRepository {
  findByType(type: string, opt: any): Promise<Feed[]>;
  findByTypeAndIds(type: string, ids: string[]): Promise<Feed[]>;
  findById(id: string): Promise<Feed>;
  findByWriterAndType(id: string, type: string): Promise<Feed[]>;
  findById(id: string): Promise<Feed>;
  findByIdJoin(id: string): Promise<Feed>;
  findAll(opt: any): Promise<Feed[]>;
  create(doc: Feed): Promise<Feed>;
  save(doc: Feed): Promise<Feed>;
}
