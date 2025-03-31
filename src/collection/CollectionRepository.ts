import { InjectModel } from '@nestjs/mongoose';
import { ICollectionRepository } from './CollectionRepository.interface';
import { Model } from 'mongoose';
import { ICollection } from './collection.entity';
import { Collection } from 'src/domain/entities/Collection';
import { HttpException } from '@nestjs/common';

export class CollectionRepository implements ICollectionRepository {
  constructor(
    @InjectModel('Collection') private readonly Collection: Model<ICollection>,
  ) {}

  async findByUser(userId: string): Promise<Collection | null> {
    const doc = await this.Collection.findOne({
      user: userId,
    });
    if (!doc) return null;

    return this.mapToDomain(doc);
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
  mapToDB(collection: Collection): Partial<ICollection> {
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
