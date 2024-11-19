import mongoose, { Model, Schema } from 'mongoose';
import { z } from 'zod';

export const PromotionZodSchema = z.object({
  name: z.string(),
  lastDate: z.string(),
  uid: z.string(),
});

export type IPromotion = z.infer<typeof PromotionZodSchema>;

export const promotionSchema: Schema<IPromotion> = new Schema({
  name: String,
  lastDate: String,
  uid: String,
});

export const Promotion =
  (mongoose.models.Promotion as Model<IPromotion, {}, {}, {}>) ||
  mongoose.model<IPromotion>('Promotion', promotionSchema);
