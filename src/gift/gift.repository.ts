import { InjectModel } from '@nestjs/mongoose';
import { GiftRepository } from './gift.repository.interface';
import { IStoreApplicant } from './entity/gift.entity';
import { Model } from 'mongoose';

export class MongoGiftRepository implements GiftRepository {
  constructor(
    @InjectModel('Gift')
    private readonly Gift: Model<IStoreApplicant>,
  ) {}
  async findAllSort(): Promise<IStoreApplicant[]> {
    return await this.Gift.find({})
      .sort('createdAt')
      .select('-_id -createdAt -updatedAt -__v');
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
