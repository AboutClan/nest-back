import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ICollection } from './collection.entity';
import { CollectionRepository } from './collection.repository.interface';

@Injectable()
export class MongoCollectionRepository implements CollectionRepository {
  constructor(
    @InjectModel('collection')
    private readonly Collection: Model<ICollection>,
  ) {}
  async findByUser(id: string): Promise<ICollection> {
    return await this.Collection.findOne({
      user: id,
    });
  }
  async findByUserPop(id: string): Promise<ICollection> {
    return await this.Collection.findOne({ user: id })
      .populate('user')
      .select('-_id');
  }
  async createCollection(
    collectionData: Partial<ICollection>,
  ): Promise<ICollection> {
    return await this.Collection.create(collectionData);
  }
  async increateStamp(userId: string): Promise<any> {
    return await this.Collection.findOneAndUpdate(
      { user: userId },
      { $inc: { stamps: 1 } },
      { new: true },
    );
  }
  async setRandomAlphabet(userId: string, alphabet: string): Promise<any> {
    return await this.Collection.findOneAndUpdate(
      { user: userId },
      {
        $push: { collects: alphabet }, // alphabet을 collects 배열에 추가
        $inc: { collectCnt: 1 }, // collectCnt 값을 1 증가
        $set: { stamps: 0 },
      },
      { new: true },
    );
  }
  async setCollection(
    alphabet: string,
    userId: string,
    collectCnt: number,
  ): Promise<any> {
    return await this.Collection.findOneAndUpdate(
      { user: userId },
      {
        $push: { collects: alphabet },
        $setOnInsert: {
          user: userId,
          collectCnt: collectCnt,
        },
      },
      { upsert: true, new: true },
    );
  }
  async updateCollection(userId: string, myAlphabets: any): Promise<any> {
    return await this.Collection.updateOne(
      { user: userId },
      { $set: { collects: myAlphabets }, $inc: { collectCnt: 1 } },
    );
  }
  async findAll(): Promise<ICollection[]> {
    return await this.Collection.find({}, '-_id -__v').populate('user');
  }
}
