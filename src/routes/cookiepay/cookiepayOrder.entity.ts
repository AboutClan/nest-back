import mongoose, { Document, Model, Schema, model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { z } from 'zod';

export const CookiepayOrderZodSchema = z.object({
  orderNo: z.string(),
  uid: z.string(),
  type: z.enum(['register', 'point']),
  amount: z.number(),
  discount: z.number().optional(),
  referrerUid: z.string().optional(),
  status: z.enum(['PENDING', 'SUCCESS', 'FAIL']),
  processedAt: z.instanceof(Date).nullable().optional(),
  createdAt: z.instanceof(Date).optional(),
  updatedAt: z.instanceof(Date).optional(),
});

export type ICookiepayOrder = z.infer<typeof CookiepayOrderZodSchema> & Document;

export const cookiepayOrderSchema: Schema<ICookiepayOrder> = new Schema(
  {
    orderNo: { type: String, required: true, unique: true },
    uid: { type: String, required: true },
    type: { type: String, enum: ['register', 'point'], required: true },
    amount: { type: Number, required: true },
    discount: { type: Number },
    referrerUid: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAIL'],
      required: true,
      default: 'PENDING',
    },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

cookiepayOrderSchema.index({ uid: 1 });

export const CookiepayOrder =
  (mongoose.models.CookiepayOrder as Model<ICookiepayOrder, {}, {}, {}>) ||
  model<ICookiepayOrder>(DB_SCHEMA.COOKIEPAY_ORDER, cookiepayOrderSchema);
