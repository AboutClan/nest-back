import { z } from 'zod';
import { IUser } from '../user/user.entity';
import mongoose, { model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';

export const commentZodSchema = z.object({
  _id: z.string().optional(),
  postId: z.string(),
  parentId: z.string().optional(),
  postType: z.enum(ENTITY.COMMENT.ENUM_POST_TYPE),
  user: z.union([z.string(), z.custom<IUser>()]),
  comment: z.string(),
  likeList: z.array(z.string()).optional().default([]),
  createdAt: z.date().optional(),
});

export type ICommentData = z.infer<typeof commentZodSchema>;

export const commentSchema: Schema<ICommentData> = new Schema({
  _id: { type: String, required: true },
  postId: { type: String, required: true },
  parentId: { type: String, required: false },
  postType: { type: String, required: true },
  user: { type: String, required: true },
  comment: { type: String, required: true },
  likeList: { type: [String], required: false, default: [] },
  createdAt: { type: Date, required: false },
});

export const Comment =
  (mongoose.models.Comment as Model<ICommentData, {}, {}, {}>) ||
  model<ICommentData>(DB_SCHEMA.COMMENT, commentSchema);
