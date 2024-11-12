<<<<<<< Updated upstream
import mongoose, {
  Document,
  Model,
  Schema,
  StringExpressionOperatorReturningBoolean,
} from 'mongoose';
=======
import mongoose, { Document, Model, Schema } from 'mongoose';
>>>>>>> Stashed changes
import { IUser } from 'src/user/entity/user.entity';
import { z } from 'zod';

export const CollectionZodSchema = z.object({
  user: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  type: z.enum(['alphabet']).default('alphabet'),
  collects: z.array(z.string()),
  collectCnt: z.number(),
  stamps: z.number(),
});

export interface ICollection extends Document {
  user: string | IUser;
  type: string;
  collects: string[];
  collectCnt: number;
  stamps: number;
}

export const CollectionSchema: Schema<ICollection> = new Schema(
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
    stamps: {
      type: Number,
      default: 0,
    },
    collectCnt: Number,
  },
  { timestamps: true },
);

export const Collection =
  (mongoose.models.Collection as Model<ICollection, {}, {}, {}>) ||
  mongoose.model<ICollection>('collection', CollectionSchema);
