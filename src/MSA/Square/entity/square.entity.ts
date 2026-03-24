import mongoose, { Document, model, Model, Schema, Types } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { avatarType } from 'src/MSA/User/entity/user.entity';
import { z } from 'zod';
const avatarZodSchema = z.object({
  type: z.number().default(null),
  bg: z.number().default(null),
});

export const PollItemZodSchema = z.object({
  _id: z.custom<Types.ObjectId>().optional(),
  name: z.string(),
  users: z.array(z.custom<Types.ObjectId>()).optional(),
});

export const SecretSquareZodSchema = z.object({
  _id: z.string().optional(),
  category: z.enum(ENTITY.SQUARE.ENUM_CATEGORY),
  title: z.string(),
  content: z.string(),
  type: z.enum(ENTITY.SQUARE.ENUM_TYPE),
  poll: z
    .object({
      pollItems: z.array(PollItemZodSchema),
      canMultiple: z.boolean(),
    })
    .optional(),
  images: z.array(z.string()).optional(),
  author: z.custom<Types.ObjectId>(),
  avatar: avatarZodSchema,
  viewers: z.array(z.custom<Types.ObjectId>()).optional(),
  like: z.array(z.custom<Types.ObjectId>()).optional(),
});

export type PollItem = z.infer<typeof PollItemZodSchema>;
export type SecretSquareItem = z.infer<typeof SecretSquareZodSchema> & Document;

export type SecretSquareCategory = (typeof ENTITY.SQUARE.ENUM_CATEGORY)[number];
export type SecretSquareType = (typeof ENTITY.SQUARE.ENUM_TYPE)[number];

export const avatarSchema: Schema<avatarType> = new Schema(
  {
    type: {
      type: Schema.Types.Number,
      default: 1,
    },
    bg: {
      type: Schema.Types.Number,
      default: 1,
    },
  },
  { timestamps: false, _id: false },
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
    avatar: {
      type: avatarSchema,
      default: {
        type: 0,
        bg: 0,
      },
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
  },
  {
    timestamps: true,
  },
);

export const SecretSquare =
  (mongoose.models.Square as Model<SecretSquareItem>) ||
  model<SecretSquareItem>(DB_SCHEMA.SQUARE, secretSquareSchema);
