import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { IUser } from 'src/routes/user/user.entity';
import { z } from 'zod';

export const FeedZodSchema = z.object({
  _id: z.string().optional(),
  title: z.string(),
  text: z.string(),
  images: z.array(z.string()).optional(),
  writer: z.union([z.string(), z.custom<IUser>()]),
  type: z.string(),
  typeId: z.string(),
  isAnonymous: z.boolean().default(false),
  like: z.union([z.array(z.string()), z.array(z.custom<IUser>())]).optional(),
  createdAt: z.string().optional(),
  subCategory: z.string().optional(),
});

export type IFeed = z.infer<typeof FeedZodSchema> & {
  addLike: (userId: string) => Promise<boolean> | null;
} & Document;

export const FeedSchema: Schema<IFeed> = new Schema(
  {
    title: {
      type: String,
    },
    text: {
      type: String,
    },
    images: {
      type: [String],
    },
    writer: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    type: {
      type: String,
    },
    typeId: {
      type: String,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    subCategory: {
      type: String,
    },
    like: [
      {
        type: Schema.Types.ObjectId,
        ref: DB_SCHEMA.USER,
      },
    ],
  },
  { timestamps: true },
);

FeedSchema.methods.addLike = async function (userId: string): Promise<boolean> {
  const index = this.like.indexOf(userId);
  if (index === -1) {
    this.like.push(userId);
    await this.save();
    return true;
  } else {
    this.like.splice(index, 1); // Remove userId from the array
    await this.save();
    return false;
  }
};

export const Feed =
  (mongoose.models.Feed as Model<IFeed, {}, {}, {}>) ||
  model<IFeed>(DB_SCHEMA.FEED, FeedSchema);
