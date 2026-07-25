import mongoose, { Document, Model, Schema, model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { z } from 'zod';

/** 한 종류의 쿠폰 (동일 couponId, 수량만 관리) */
export const CouponZodSchema = z.object({
  partnerId: z.string(),
  name: z.string().optional(),
  totalCount: z.number(),
  remainingCount: z.number(),
  createdAt: z.instanceof(Date).optional(),
  updatedAt: z.instanceof(Date).optional(),
});

export type ICoupon = z.infer<typeof CouponZodSchema> & Document;

export const couponSchema: Schema<ICoupon> = new Schema(
  {
    partnerId: { type: String, required: true },
    name: { type: String },
    totalCount: { type: Number, required: true, default: 0 },
    remainingCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

couponSchema.index({ partnerId: 1 });

export const Coupon =
  (mongoose.models.Coupon as Model<ICoupon, {}, {}, {}>) ||
  model<ICoupon>(DB_SCHEMA.COUPON, couponSchema);
