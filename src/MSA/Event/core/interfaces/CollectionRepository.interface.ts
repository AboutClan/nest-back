import { Collection } from 'src/domain/entities/Collection';

export interface ICollectionRepository {
  findByUser(userId: string): Promise<Collection | null>;
  findByUserJoin(userId: string): Promise<Collection | null>;
  findAll(): Promise<Collection[]>;
  findFriend(uid:string): Promise<Collection[]>;
  create(collection: Collection): Promise<Collection>;
  save(collection: Collection): Promise<Collection>;
  resetAllCollectCnt(): Promise<void>;
}
