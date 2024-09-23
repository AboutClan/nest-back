import mongoose, { Model, Schema, model } from 'mongoose';
import { Dayjs } from 'dayjs';
import { z } from 'zod';

export const StoreZodSchema = z.object({
  uid: z.string(),
  name: z.string(),
  cnt: z.number(),
  giftId: z.number().optional(),
});

export interface IStoreApplicant {
  uid: string;
  name: string;
  cnt: number;
  giftId?: number;
}

const giftSchema: Schema = new Schema(
  {
    uid: { type: String, ref: 'User' },
    name: { type: String, ref: 'User' },
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
  mongoose.model<IStoreApplicant>('GiftModel', giftSchema);
