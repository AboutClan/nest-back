import mongoose, { Document, model, Model, Schema, Types } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { IUser } from 'src/routes/user/user.entity';
import { z } from 'zod';

export const SubCommentZodSchema = z.object({
  user: z.union([z.string(), z.custom<IUser>()]),
  comment: z.string(),
  likeList: z.array(z.string()).default([]).optional(),
});

export const CommentZodSchema = z.object({
  _id: z.custom<Types.ObjectId>().optional(),
  user: z.union([z.string(), z.custom<IUser>()]),
  comment: z.string(),
  subComments: z.array(SubCommentZodSchema).optional(),
  likeList: z.array(z.string()).optional(),
});

export const PollItemZodSchema = z.object({
  _id: z.custom<Types.ObjectId>().optional(),
  name: z.string(),
  users: z.array(z.custom<Types.ObjectId>()).optional(),
});

export const SecretSquareZodSchema = z.object({
  _id: z.string().optional(),
  category: z.enum(['일상', '고민', '정보', '같이해요']),
  title: z.string(),
  content: z.string(),
  type: z.enum(['general', 'poll']),
  poll: z
    .object({
      pollItems: z.array(PollItemZodSchema),
      canMultiple: z.boolean(),
    })
    .optional(),
  images: z.array(z.string()).optional(),
  author: z.custom<Types.ObjectId>(),
  viewers: z.array(z.custom<Types.ObjectId>()).optional(),
  like: z.array(z.custom<Types.ObjectId>()).optional(),
  comments: z.array(CommentZodSchema).optional(),
});

export type subCommentType = z.infer<typeof SubCommentZodSchema>;
export type Comment = z.infer<typeof CommentZodSchema> & Document;
export type PollItem = z.infer<typeof PollItemZodSchema>;
export type SecretSquareItem = z.infer<typeof SecretSquareZodSchema> & Document;

export type SecretSquareCategory = '일상' | '고민' | '정보' | '같이해요';

export type SecretSquareType = 'general' | 'poll';

export const subCommentSchema: Schema<subCommentType> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
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

export const commentSchema = new Schema<Comment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
      required: true,
    },
    comment: {
      type: String,
      required: true,
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

const pollItemSchema = new Schema<PollItem>({
  name: {
    type: String,
    required: true,
  },
  users: {
    type: [Schema.Types.ObjectId],
    ref: DB_SCHEMA.USER,
    default: [],
  },
});

const pollSchema = new Schema(
  {
    pollItems: {
      type: [pollItemSchema],
      required: true,
    },
    canMultiple: {
      type: Boolean,
      required: true,
    },
  },
  {
    _id: false,
  },
);

export const secretSquareSchema = new Schema<SecretSquareItem>(
  {
    category: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      minLength: 1,
    },
    content: {
      type: String,
      required: true,
      minLength: 1,
    },
    type: {
      type: String,
      required: true,
    },
    poll: {
      type: pollSchema,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    viewers: {
      type: [Schema.Types.ObjectId],
      ref: DB_SCHEMA.USER,
      default: [],
    },
    like: {
      type: [Schema.Types.ObjectId],
      ref: DB_SCHEMA.USER,
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const SecretSquare =
  (mongoose.models.Square as Model<SecretSquareItem>) ||
  model<SecretSquareItem>(DB_SCHEMA.SQUARE, secretSquareSchema);
