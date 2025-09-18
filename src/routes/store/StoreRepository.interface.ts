import { Store } from 'src/domain/entities/Store/Store';

export interface IStoreRepository {
  getStores(status: string | string[], cursor: number): Promise<Store[]>;
  getStoreById(id: string): Promise<Store>;
  create(store: Store): Promise<Store>;
}
