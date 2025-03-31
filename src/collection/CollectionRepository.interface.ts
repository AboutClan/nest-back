import { Collection } from 'src/domain/entities/Collection';

export interface ICollectionRepository {
  findByUser(userId: string): Promise<Collection | null>;
  create(collection: Collection): Promise<Collection>;
  save(collection: Collection): Promise<Collection>;
}
