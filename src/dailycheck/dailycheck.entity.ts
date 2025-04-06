import mongoose, { Model, Schema } from 'mongoose';
import { z } from 'zod';

export const DailyCheckZodSchema = z.object({
  _id: z.string().optional(),
  uid: z.string(),
  name: z.string(),
  createdAt: z.instanceof(Date).optional(),
  updatedAt: z.instanceof(Date).optional(),
});

export type IDailyCheck = z.infer<typeof DailyCheckZodSchema>;

export const dailyCheckSchema: Schema<IDailyCheck> = new Schema(
  {
    uid: String,
    name: String,
  },
  { timestamps: true },
);

export const DailyCheck =
  (mongoose.models.DailyCheck as Model<IDailyCheck, {}, {}, {}>) ||
  mongoose.model<IDailyCheck>('DailyCheck', dailyCheckSchema);
