import { HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { Collection } from 'src/domain/entities/Collection';
import { ICollectionRepository } from '../core/interfaces/CollectionRepository.interface';
import { ICollection } from '../entity/collection.entity';

export class CollectionRepository implements ICollectionRepository {
  constructor(
    @InjectModel(DB_SCHEMA.COLLECTION)
    private readonly Collection: Model<ICollection>,
  ) {}

  async findByUser(userId: string): Promise<Collection | null> {
    const doc = await this.Collection.findOne({
      user: userId,
    });
    if (!doc) return null;

    return this.mapToDomain(doc);
  }

  async findByUserJoin(userId: string): Promise<Collection | null> {
    const doc = await this.Collection.findOne({
      user: userId,
    }).populate({
      path: 'user',
      select: ENTITY.USER.C_SIMPLE_USER,
    });
    if (!doc) return null;

    return this.mapToDomain(doc);
  }

  async findAll(): Promise<Collection[]> {
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setUTCMonth(threeMonthsAgo.getUTCMonth() - 1); // UTC 기준 3개월 전

    const docs = await this.Collection.find({
      $or: [
        { $expr: { $gte: [{ $size: '$collects' }, 2] } }, // collect 길이 ≥ 2
        { updatedAt: { $gte: threeMonthsAgo } }, // 최근 3개월 이내
      ],
    }).populate({
      path: 'user',
      select: ENTITY.USER.C_SIMPLE_USER,
    });

    return docs.map((item) => this.mapToDomain(item));
  }

  async create(collection: Collection): Promise<Collection> {
    const docToSave = this.mapToDB(collection);
    const createdDoc = await this.Collection.create(docToSave);
    return this.mapToDomain(createdDoc);
  }

  async save(collection: Collection): Promise<Collection> {
    const docToSave = this.mapToDB(collection);
    const { id, collectCnt, ...toUpdate } = docToSave;

    const updatedDoc = await this.Collection.findByIdAndUpdate(
      id,
      {
        $set: toUpdate, // collects, stamps 등
        $inc: { collectCnt: 1 }, // ✅ 1 증가
      },
      { new: true, runValidators: true },
    );

    if (!updatedDoc) {
      throw new HttpException(`Collection not found for id=${id}`, 500);
    }

    return this.mapToDomain(updatedDoc);
  }

  private mapToDomain(doc: ICollection): Collection {
    const collection = new Collection({
      id: doc._id as string,
      user: doc.user,
      type: doc.type,
      collects: doc.collects,
      collectCnt: doc.collectCnt,
      stamps: doc.stamps,
    });

    return collection;
  }
  private mapToDB(collection: Collection): Partial<ICollection> {
    return {
      id: collection.id,
      user: collection.user,
      type: collection.type,
      collects: collection.collects,
      collectCnt: collection.collectCnt,
      stamps: collection.stamps,
    };
  }
}
