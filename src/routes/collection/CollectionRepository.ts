import { HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Collection } from 'src/domain/entities/Collection';
import { ICollection } from './collection.entity';
import { ICollectionRepository } from './CollectionRepository.interface';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

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
    }).populate('user');
    if (!doc) return null;

    return this.mapToDomain(doc);
  }

  async findAll(): Promise<Collection[]> {
    const doc = await this.Collection.find({}).populate('user');
    if (!doc) return null;

    return doc.map((item) => this.mapToDomain(item));
  }

  async create(collection: Collection): Promise<Collection> {
    const docToSave = this.mapToDB(collection);
    const createdDoc = await this.Collection.create(docToSave);
    return this.mapToDomain(createdDoc);
  }

  async save(collection: Collection): Promise<Collection> {
    const docToSave = this.mapToDB(collection);
    const updatedDoc = await this.Collection.findByIdAndUpdate(
      docToSave.id,
      docToSave,
      { new: true },
    );
    if (!updatedDoc) {
      throw new HttpException(
        `Collection not found for id=${docToSave._id}`,
        500,
      );
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
