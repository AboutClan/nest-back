import { ICollection } from './entity/collection.entity';

export interface CollectionRepository {
  findByUser(id: string): Promise<ICollection>;
  createCollection(collectionData: Partial<ICollection>): Promise<ICollection>;
  increateStamp(userId: string): Promise<any>;
  setRandomAlphabet(userId: string, alphabet: string): Promise<any>;
  setCollection(
    alphabet: string,
    userId: string,
    collectCnt: number,
  ): Promise<any>;
  updateCollection(userId: string, myAlphabets: any): Promise<any>;
  findAll(): Promise<ICollection[]>;
}
