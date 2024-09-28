import mongoose, { Model, Schema } from 'mongoose';
import { z } from 'zod';

export const PromotionZodSchema = z.object({
  name: z.string(),
  lastDate: z.string(),
  uid: z.string(),
});

export interface IPromotion {
  name: string;
  lastDate: Date;
  uid: string;
}

export const promotionSchema: Schema<IPromotion> = new Schema({
  name: String,
  lastDate: Date,
  uid: String,
});

export const Promotion =
  (mongoose.models.Promotion as Model<IPromotion, {}, {}, {}>) ||
  mongoose.model<IPromotion>('Promotion', promotionSchema);
