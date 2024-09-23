import mongoose, {
  Model,
  Schema,
  StringExpressionOperatorReturningBoolean,
} from 'mongoose';
import { IUser } from './user';
import { z } from 'zod';

export const CollectionZodSchema = z.object({
  user: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  type: z.enum(['alphabet']).default('alphabet'),
  collects: z.array(z.string()),
  collectCnt: z.number(),
});

export interface ICollection {
  user: string | IUser;
  type: string;
  collects: string[];
  collectCnt: number;
}

const colectionSchema: Schema<ICollection> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['alphabet'],
    },
    collects: {
      type: [String],
    },
    collectCnt: Number,
  },
  { timestamps: true },
);

export const Collection =
  (mongoose.models.Collection as Model<ICollection, {}, {}, {}>) ||
  mongoose.model<ICollection>('collection', colectionSchema);
