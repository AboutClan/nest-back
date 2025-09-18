import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { IStore, Store } from 'src/domain/entities/Store/Store';
import { IStoreRepository } from './StoreRepository.interface';

export class StoreRepository implements IStoreRepository {
  constructor(
    @InjectModel(DB_SCHEMA.STORE)
    private readonly storeModel: Model<IStore>,
  ) {}

  async getStores(status: string[], cursor: number): Promise<Store[]> {
    const limit = 10;
    const offset = cursor * limit;

    const stores = await this.storeModel
      .find({ status: { $in: status } })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();
    if (!stores) return [];
    return stores.map((store) => this.mapToEntity(store));
  }

  async getStoreById(id: string): Promise<Store> {
    const store = await (
      await this.storeModel.findById(id).exec()
    ).populate('applicants.user');
    if (!store) return null;

    return this.mapToEntity(store);
  }

  async create(store: Store): Promise<Store> {
    const createdDoc = await this.storeModel.create(store);
    return this.mapToEntity(createdDoc);
  }

  mapToEntity(store: any): Store {
    return new Store(store);
  }

  mapToDb(store: Store): any {
    return {
      _id: store._id,
      name: store.name,
      image: store.image,
      point: store.point,
      winnerCnt: store.winnerCnt,
      status: store.status,
      applicants: store.applicants,
    };
  }
}
