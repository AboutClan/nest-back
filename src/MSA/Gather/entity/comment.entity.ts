import { z } from 'zod';
import { IUser } from 'src/MSA/User/entity/user.entity';
import mongoose, { model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

export const GatherCommentZodSchema = z.object({
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

export type GatherCommentType = z.infer<typeof GatherCommentZodSchema>;

export const gatherCommentSchema: Schema<GatherCommentType> = new Schema({
  postId: { type: String, required: true },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: DB_SCHEMA.GATHER_COMMENT,
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

export const GatherComment =
  (mongoose.models.Comment as Model<GatherCommentType, {}, {}, {}>) ||
  model<GatherCommentType>(DB_SCHEMA.GATHER_COMMENT, gatherCommentSchema);
