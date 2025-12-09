import { InjectModel } from '@nestjs/mongoose';
import { IPromotion } from './promotion.entity';
import { PromotionRepository } from './promotion.repository';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

export class MongoPromotionRepository implements PromotionRepository {
  constructor(
    @InjectModel(DB_SCHEMA.PROMOTION)
    private readonly Promotion: Model<IPromotion>,
  ) {}
  async findAll(): Promise<IPromotion[]> {
    return await this.Promotion.find({}, '-_id -__v');
  }
  async findByName(name: string): Promise<IPromotion> {
    return await this.Promotion.findOne({ name });
  }
  async updatePromotion(
    name: string,
    promotionData: Partial<IPromotion>,
  ): Promise<null> {
    await this.Promotion.updateOne({ name }, promotionData);
    return null;
  }
  async createPromotion(
    promotionData: Partial<IPromotion>,
  ): Promise<IPromotion> {
    return await this.Promotion.create(promotionData);
  }
}
