import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { IUser } from 'src/routes/user/user.entity';
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
  status: z.enum(ENTITY.CHAT.ENUM_STATUS).default(ENTITY.CHAT.DEFAULT_STATUS), // status 필드에 제한 추가
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
    ref: DB_SCHEMA.USER,
  },
  user2: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: DB_SCHEMA.USER,
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
  model<IChat>(DB_SCHEMA.CHAT, ChatSchema);
