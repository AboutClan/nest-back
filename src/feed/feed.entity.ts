import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { IUser } from 'src/user/user.entity';
import { z } from 'zod';

export const SubCommentZodSchema = z.object({
  id: z.string().optional(),
  user: z.union([z.string(), z.custom<IUser>()]),
  comment: z.string(),
  likeList: z.array(z.string()).nullable().optional(),
});

export const CommentZodSchema = z.object({
  id: z.string().optional(),
  user: z.union([z.string(), z.custom<IUser>()]),
  comment: z.string(),
  subComments: z.array(SubCommentZodSchema).optional(),
  likeList: z.array(z.string()).nullable().optional(),
});

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
  comments: z.array(CommentZodSchema).optional(),
  createdAt: z.string().optional(),
  subCategory: z.string().optional(),
});

export type commentType = z.infer<typeof CommentZodSchema>;
export type subCommentType = z.infer<typeof SubCommentZodSchema>;
export type IFeed = z.infer<typeof FeedZodSchema> & {
  addLike: (userId: string) => Promise<boolean> | null;
} & Document;

export const subCommentSchema: Schema<subCommentType> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    comment: {
      type: String,
    },
    likeList: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const commentSchema: Schema<commentType> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    comment: {
      type: String,
    },
    subComments: {
      type: [subCommentSchema],
      default: [],
    },
    likeList: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

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
      ref: 'User',
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
    comments: {
      type: [commentSchema],
      default: [],
    },
    like: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
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
  model<IFeed>('Feed', FeedSchema);
