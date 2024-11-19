import mongoose, { Model, Schema } from 'mongoose';
import { z } from 'zod';

export const DailyCheckZodSchema = z.object({
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
    createdAt: Date,
    updatedAt: Date,
  },
  { timestamps: true },
);

export const DailyCheck =
  (mongoose.models.DailyCheck as Model<IDailyCheck, {}, {}, {}>) ||
  mongoose.model<IDailyCheck>('DailyCheck', dailyCheckSchema);
