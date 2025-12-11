import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { Store } from 'src/domain/entities/Store/Store';
import { IStore } from '../entity/store.entity';
import { IStoreRepository } from '../core/interfaces/StoreRepository.interface';

export class StoreRepository implements IStoreRepository {
  constructor(
    @InjectModel(DB_SCHEMA.STORE)
    private readonly storeModel: Model<IStore>,
  ) {}

  async findAll(): Promise<Store[]> {
    const stores = await this.storeModel.find().exec();
    if (!stores) return [];
    return stores.map((store) => this.mapToEntity(store));
  }

  async getStores(status: string[], cursor: number): Promise<Store[]> {
    const limit = 10;
    const offset = cursor * limit;

    const stores = await this.storeModel
      .find({ status: { $in: status } })
      .populate('applicants.user', ENTITY.USER.C_SIMPLE_USER)
      .populate('winner', ENTITY.USER.C_SIMPLE_USER)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();
    if (!stores) return [];
    return stores.map((store) => this.mapToEntity(store));
  }

  async getStoreById(id: string): Promise<Store> {
    const store = await this.storeModel
      .findById(id)
      .populate('applicants.user', ENTITY.USER.C_SIMPLE_USER)
      .populate('winner', ENTITY.USER.C_SIMPLE_USER)
      .exec();
    if (!store) return null;

    return this.mapToEntity(store);
  }

  async create(store: Store): Promise<Store> {
    const createdDoc = await this.storeModel.create(store);
    return this.mapToEntity(createdDoc);
  }

  async save(store: Store): Promise<Store> {
    const updatedDoc = await this.storeModel.findByIdAndUpdate(
      store._id,
      this.mapToDb(store),
      { new: true },
    );
    return this.mapToEntity(updatedDoc);
  }

  mapToEntity(store: any): Store {
    return new Store(store);
  }

  mapToDb(store: Store): any {
    return {
      name: store.name,
      image: store.image,
      point: store.point,
      winnerCnt: store.winnerCnt,
      status: store.status,
      max: store.max,
      winner: store.winner,
      applicants: store.applicants,
    };
  }
}
