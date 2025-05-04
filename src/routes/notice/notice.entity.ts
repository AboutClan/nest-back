import mongoose, { Model, Schema } from 'mongoose';
import { z } from 'zod';

export const NoticeZodSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: z.string().nullable().optional(),
  message: z.string(),
  status: z.string().nullable().optional(),
  sub: z.string().nullable().optional(),
});

export type INotice = z.infer<typeof NoticeZodSchema>;

export const noticeSchema: Schema<INotice> = new Schema(
  {
    from: String,
    to: String,
    type: {
      type: String,
      enum: ['like', 'friend', 'alphabet'],
      default: 'like',
    },
    message: String,
    sub: String,
    status: {
      type: String,
      enum: ['pending', 'refusal', 'approval', 'response'],
    },
  },
  { timestamps: true },
);

export const Notice =
  (mongoose.models.Notice as Model<INotice, {}, {}, {}>) ||
  mongoose.model<INotice>('Notice', noticeSchema);
