import mongoose, { Model, Schema, model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { z } from 'zod';

export const StoreZodSchema = z.object({
  uid: z.string(),
  name: z.string(),
  cnt: z.number(),
  giftId: z.number().optional(),
});

export type IStoreApplicant = z.infer<typeof StoreZodSchema>;

export const giftSchema: Schema = new Schema(
  {
    uid: { type: String, ref: DB_SCHEMA.USER },
    name: { type: String, ref: DB_SCHEMA.USER },
    cnt: { type: Number, default: 0 },
    giftId: { type: Number },
  },
  {
    toJSON: {
      transform(_doc, ret) {
        delete ret.createdAt;
        delete ret.upadtedAt;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const GiftModel =
  (mongoose.models.GiftModel as Model<IStoreApplicant, {}, {}, {}>) ||
  mongoose.model<IStoreApplicant>(DB_SCHEMA.GIFT, giftSchema);
