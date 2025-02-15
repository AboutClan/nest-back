import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { IUser } from 'src/user/user.entity';
import { z } from 'zod';

// Zod로 IContent 유효성 검사 스키마 정의
export const ContentZodSchema = z.object({
  userId: z.string(),
  content: z.string(),
  createdAt: z.date().optional(),
  _id: z.string().optional(),
});

// Zod로 IChat 유효성 검사 스키마 정의
export const ChatZodSchema = z.object({
  user1: z.union([z.string(), z.custom<IUser>()]), // 여기서는 ObjectId를 문자열로 표현
  user2: z.union([z.string(), z.custom<IUser>()]),
  status: z.enum(['normal', 'inactive', 'deleted']).default('normal'), // status 필드에 제한 추가
  contents: z.array(z.custom<IContent>()).optional(), // Content 배열
});

export type IContent = z.infer<typeof ContentZodSchema>;
export type IChat = z.infer<typeof ChatZodSchema> & Document;

const ContentSchema: Schema<IContent> = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      require: true,
    },
  },
  {
    timestamps: true,
  },
);

export const ChatSchema: Schema<IChat> = new Schema({
  user1: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  user2: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  status: {
    type: String,
    required: true,
    default: 'normal',
  },
  contents: {
    type: [ContentSchema],
    default: [],
    required: true,
  },
});

export const Chat =
  (mongoose.models.Chat as Model<IChat, {}, {}, {}>) ||
  model<IChat>('Chat', ChatSchema);
