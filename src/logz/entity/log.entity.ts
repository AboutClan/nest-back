import mongoose, { model, Schema, Model } from 'mongoose';
import { z } from 'zod';

const MetaZodSchema = z.object({
  type: z.string(),
  uid: z.number(),
  value: z.number(),
  sub: z.string().nullable(),
});

const LogZodSchema = z.object({
  timeStamp: z.date(),
  level: z.string(),
  message: z.string(),
  meta: MetaZodSchema,
});

export interface ILog {
  timeStamp: Date;
  level: string;
  message: string;
  meta: { type: string; uid: number; value: number; sub?: string };
}

const metaSchema = new Schema({
  type: String,
  uid: String,
  value: Number,
  sub: String,
});

export const LogSchema: Schema<ILog> = new Schema({
  timeStamp: Date,
  level: String,
  message: String,
  meta: {
    type: metaSchema,
    enum: ['score', 'point', 'deposit'],
  },
});

export const Log =
  (mongoose.models.Log as Model<ILog, {}, {}, {}>) ||
  model<ILog>('Log', LogSchema);
