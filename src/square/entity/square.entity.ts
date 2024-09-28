import mongoose, { model, Model, Schema, Types } from 'mongoose';
import { IUser } from 'src/user/entity/user.entity';
import { z } from 'zod';

export const SubCommentZodSchema = z.object({
  user: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  comment: z.string(),
  likeList: z.array(z.string()),
});

export const CommentZodSchema = z.object({
  user: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  comment: z.string(),
  subComments: z.array(SubCommentZodSchema).optional(),
  likeList: z.array(z.string()).optional(),
});

export const PollItemZodSchema = z.object({
  _id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  name: z.string(),
  users: z.array(
    z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  ),
});

export const SecretSquareZodSchema = z.object({
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
  author: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  viewers: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'))
    .optional(),
  like: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'))
    .optional(),
  comments: z.array(CommentZodSchema).optional(),
});

export type SecretSquareCategory = '일상' | '고민' | '정보' | '같이해요';

export type SecretSquareType = 'general' | 'poll';

interface Comment {
  user: Types.ObjectId;
  comment: string;
  subComments?: subCommentType[];
  likeList?: string[];
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

export const commentSchema = new Schema<Comment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

export interface subCommentType {
  user: string | IUser;
  comment: string;
  likeList?: string[];
}
export interface SecretSquareItem {
  category: SecretSquareCategory;
  title: string;
  content: string;
  type: SecretSquareType;
  poll: {
    pollItems: PollItem[];
    canMultiple: boolean;
  };
  images: string[];
  author: Types.ObjectId;
  viewers: Types.ObjectId[];
  like: Types.ObjectId[];
  comments: Comment[];
}

export interface PollItem {
  _id: Types.ObjectId;
  name: string;
  users: Types.ObjectId[];
}

const pollItemSchema = new Schema<PollItem>({
  name: {
    type: String,
    required: true,
  },
  users: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
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
      ref: 'User',
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    viewers: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    like: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
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
  model<SecretSquareItem>('SecretSquare', secretSquareSchema);
