import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { IUser } from 'src/domain/entities/User/User';
import { z } from 'zod';

export const ZodPrizeSchema = z.object({
  date: z.date(),
  gift: z.string(),
  winner: z.union([z.string(), z.custom<IUser>()]),
  category: z.string(),
});

export type IPrize = z.infer<typeof ZodPrizeSchema> & Document;

export const PrizeSchema: Schema<IPrize> = new Schema({
  date: {
    type: Date,
    required: true,
  },
  gift: {
    type: String,
    required: true,
  },
  winner: {
    type: Schema.Types.ObjectId,
    ref: DB_SCHEMA.USER,
  },
  category: String,
});

export const Prize =
  (mongoose.models.Prize as Model<IPrize, {}, {}, {}>) ||
  model<IPrize>(DB_SCHEMA.PRIZE, PrizeSchema);
