import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { IUser } from 'src/user/entity/user.entity';
import { z } from 'zod';

export const SubCommentZodSchema = z.object({
  user: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  comment: z.string(),
  likeList: z.array(z.string()).nullable().optional(),
});

export const CommentZodSchema = z.object({
  user: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  comment: z.string(),
  subComments: z.array(SubCommentZodSchema).optional(),
  likeList: z.array(z.string()).nullable().optional(),
});

export const FeedZodSchema = z.object({
  title: z.string(),
  text: z.string(),
  images: z.array(z.string()).optional(),
  writer: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  type: z.string(),
  typeId: z.string(),
  isAnonymous: z.boolean().default(false),
  like: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'))
    .optional(),
  comments: z.array(CommentZodSchema).optional(),
  createdAt: z.string().optional(),
  subCategory: z.string().optional(),
});

export interface commentType {
  user: string | IUser;
  comment: string;
  subComments?: subCommentType[];
  likeList?: string[];
}

export interface subCommentType {
  user: string | IUser;
  comment: string;
  likeList?: string[];
}

export interface IFeed extends Document {
  title: string;
  text: string;
  images: string[];
  writer: string | IUser;
  type: string;
  typeId: string;
  isAnonymous?: boolean;
  like: string[] | IUser[];
  comments: commentType[];
  createdAt: string;
  addLike(userId: string): Promise<boolean>;
  subCategory: string;
}

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
