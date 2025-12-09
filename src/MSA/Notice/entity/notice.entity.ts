import mongoose, { Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { z } from 'zod';

export const NoticeZodSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: z.string().nullable().optional(),
  message: z.string().optional(),
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
      enum: ENTITY.NOTICE.ENUM_TYPE,
      default: ENTITY.NOTICE.DEFAULT_TYPE,
    },
    message: String,
    sub: String,
    status: {
      type: String,
      enum: ENTITY.NOTICE.ENUM_STATUS,
    },
  },
  { timestamps: true },
);

export const Notice =
  (mongoose.models.Notice as Model<INotice, {}, {}, {}>) ||
  mongoose.model<INotice>(DB_SCHEMA.NOTICE, noticeSchema);
