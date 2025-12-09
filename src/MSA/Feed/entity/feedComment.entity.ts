import { z } from 'zod';
import mongoose, { model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { IUser } from 'src/MSA/User/entity/user.entity';

export const feedCommentZodSchema = z.object({
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

export type IFeedCommentData = z.infer<typeof feedCommentZodSchema>;

export const feedCommentSchema: Schema<IFeedCommentData> = new Schema({
  postId: { type: String, required: true },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: DB_SCHEMA.COMMENT,
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

export const FeedComment =
  (mongoose.models.FeedComment as Model<IFeedCommentData, {}, {}, {}>) ||
  model<IFeedCommentData>(DB_SCHEMA.FEED_COMMENT, feedCommentSchema);
