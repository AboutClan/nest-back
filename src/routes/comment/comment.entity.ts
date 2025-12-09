import { z } from 'zod';
import { IUser } from '../../MSA/User/entity/user.entity';
import mongoose, { model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';

export const commentZodSchema = z.object({
  _id: z.string().optional(),
  postId: z.string(),
  parentId: z.union([z.string(), z.custom<any>()]),
  postType: z.enum(ENTITY.COMMENT.ENUM_POST_TYPE),
  user: z.union([z.string(), z.custom<IUser>()]),
  comment: z.string(),
  likeList: z
    .union([z.array(z.string()), z.array(z.custom<IUser>())])
    .optional(),
  createdAt: z.date().optional(),
});

export type ICommentData = z.infer<typeof commentZodSchema>;

export const commentSchema: Schema<ICommentData> = new Schema({
  postId: { type: String, required: true },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: DB_SCHEMA.COMMENT,
  },
  postType: { type: String, required: true },
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

export const Comment =
  (mongoose.models.Comment as Model<ICommentData, {}, {}, {}>) ||
  model<ICommentData>(DB_SCHEMA.COMMENT, commentSchema);
