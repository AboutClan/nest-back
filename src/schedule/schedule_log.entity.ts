import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { z } from 'zod';

export const ScheduleLogZodSchema = z.object({
  _id: z.string().optional(),
  date: z.date(),
  scheduleName: z.string().optional(),
  status: z.string().optional(),
  error: z.string().optional(),
});

export type IScheduleLog = z.infer<typeof ScheduleLogZodSchema> & Document;

export const ScheduleLogSchema = new Schema<IScheduleLog>(
  {
    date: {
      type: Date,
      required: true,
    },
    scheduleName: {
      type: String,
    },
    status: {
      type: String,
      default: 'success',
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export const ScheduleLog =
  (mongoose.models.ScheduleLog as Model<IScheduleLog>) ||
  model<IScheduleLog>(DB_SCHEMA.SCHEDULE_LOG, ScheduleLogSchema);
