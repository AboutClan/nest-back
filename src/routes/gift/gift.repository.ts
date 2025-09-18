import { InjectModel } from '@nestjs/mongoose';
import { GiftRepository } from './gift.repository.interface';
import { IStoreApplicant } from './gift.entity';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

export class MongoGiftRepository implements GiftRepository {
  constructor(
    @InjectModel(DB_SCHEMA.GIFT)
    private readonly Gift: Model<IStoreApplicant>,
  ) {}
  async findAllSort(): Promise<IStoreApplicant[]> {
    return await this.Gift.find({})
      .sort('createdAt')
      .select('-_id -createdAt -updatedAt -__v')
      .lean();
  }
  async findById(giftId: number): Promise<IStoreApplicant[]> {
    return await this.Gift.find({ giftId }).select(
      '-_id -createdAt -updatedAt -__v',
    );
  }
  async findByUidGiftId(uid: string, giftId: string): Promise<IStoreApplicant> {
    return await this.Gift.findOne({
      uid,
      giftId,
    });
  }
  async updateGift(uid: string, giftData: Partial<IStoreApplicant>) {
    return await this.Gift.findOneAndUpdate({ uid }, giftData, {
      new: true,
      runValidators: true,
    });
  }
  async createGift(
    giftData: Partial<IStoreApplicant>,
  ): Promise<IStoreApplicant> {
    return await this.Gift.create(giftData);
  }
}
