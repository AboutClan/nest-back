import { Collection } from 'src/domain/entities/Collection';

export interface ICollectionRepository {
  findByUser(userId: string): Promise<Collection | null>;
  findByUserJoin(userId: string): Promise<Collection | null>;
  findAll(): Promise<Collection[]>;
  create(collection: Collection): Promise<Collection>;
  save(collection: Collection): Promise<Collection>;
}
