import mongoose, { Document, Model, Schema } from 'mongoose';
import { IUser } from 'src/routes/user/user.entity';
import { z } from 'zod';

export const CollectionZodSchema = z.object({
  user: z.union([
    z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
    z.custom<IUser>(),
  ]),
  type: z.enum(['alphabet']).default('alphabet'),
  collects: z.array(z.string()).default([]),
  collectCnt: z.number().default(0),
  stamps: z.number().default(0),
});

export type ICollection = z.infer<typeof CollectionZodSchema> & Document;

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
