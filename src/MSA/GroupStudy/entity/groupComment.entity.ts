import { z } from 'zod';
import { IUser } from 'src/MSA/User/entity/user.entity';
import mongoose, { model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

export const groupCommentZodSchema = z.object({
  _id: z.string().optional(),
  postId: z.string(),
  parentId: z.union([z.string(), z.custom<any>()]),
  user: z.union([z.string(), z.custom<IUser>()]),
  comment: z.string(),
  likeList: z
    .union([z.array(z.string()), z.array(z.custom<IUser>())])
    .optional(),
  createdAt: z.date().optional(),
});

export type GroupCommentType = z.infer<typeof groupCommentZodSchema>;

export const groupCommentSchema: Schema<GroupCommentType> = new Schema({
  postId: { type: String, required: true },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: DB_SCHEMA.GROUP_COMMENT,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: DB_SCHEMA.USER,
  },
  comment: { type: String, required: true },
  likeList: {
    type: [
      {
        type: Schema.Types.ObjectId,
        ref: DB_SCHEMA.USER,
      },
    ],
    required: false,
    default: [],
  },
  createdAt: { type: Date, required: false },
});

export const GroupComment =
  (mongoose.models.GroupComment as Model<GroupCommentType, {}, {}, {}>) ||
  model<GroupCommentType>(DB_SCHEMA.GROUP_COMMENT, groupCommentSchema);
