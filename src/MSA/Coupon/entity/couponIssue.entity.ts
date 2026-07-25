import mongoose, { Document, Model, Schema, Types, model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { z } from 'zod';

/** 사용자가 특정 couponId를 발급받은 기록 (유저당 1회) */
export const CouponIssueZodSchema = z.object({
  couponId: z.instanceof(Types.ObjectId),
  userId: z.string(),
  issuedAt: z.date(),
  createdAt: z.instanceof(Date).optional(),
  updatedAt: z.instanceof(Date).optional(),
});

export type ICouponIssue = z.infer<typeof CouponIssueZodSchema> & Document;

export const couponIssueSchema: Schema<ICouponIssue> = new Schema(
  {
    couponId: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.COUPON,
      required: true,
    },
    userId: { type: String, required: true },
    issuedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

couponIssueSchema.index({ couponId: 1, userId: 1 }, { unique: true });

export const CouponIssue =
  (mongoose.models.CouponIssue as Model<ICouponIssue, {}, {}, {}>) ||
  model<ICouponIssue>(DB_SCHEMA.COUPON_ISSUE, couponIssueSchema);
