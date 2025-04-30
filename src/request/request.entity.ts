import { Dayjs, isDayjs } from 'dayjs';
import mongoose, { model, Model, Schema } from 'mongoose';
import { LOCATION_LIST } from 'src/Constants/constants';
import { z } from 'zod';

const dayjsSchema = z.custom<Dayjs>((value) => isDayjs(value), {
  message: 'Invalid Dayjs object',
});

export const RestZodSchema = z.object({
  type: z.string(),
  start: z.date(),
  end: z.date(),
});

export const RequestZodSchema = z.object({
  category: z.string(),
  title: z.string().optional(),
  location: z.string(),
  writer: z.union([z.string(), z.any()]),
  content: z.string(),
  rest: RestZodSchema.optional(),
});

export interface restType {
  type: string;
  start: Dayjs;
  end: Dayjs;
}
export type IRequestData = z.infer<typeof RequestZodSchema>;

export const restSchema: Schema<restType> = new Schema(
  {
    type: {
      type: String,
      enum: ['일반', '특별'],
    },
    start: Date,
    end: Date,
  },
  { _id: false },
);

export type RequestCategory =
  | '건의'
  | '신고'
  | '홍보'
  | '휴식'
  | '충전'
  | '탈퇴'
  | '출석'
  | '배지'
  | '불참'
  | '조모임'
  | '지원금'
  | '장소 추가'
  | '출금';

export type RequestLocation = (typeof LOCATION_LIST)[number];

export const RequestSchema: Schema<IRequestData> = new Schema(
  {
    category: {
      type: String,
      enum: [
        '건의',
        '신고',
        '홍보',
        '휴식',
        '충전',
        '지원금',
        '탈퇴',
        '출석',
        '배지',
        '불참',
        '조모임',
        '장소 추가',
        '출금',
      ],
    },
    title: {
      type: String,
    },
    writer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    content: {
      type: String,
    },
    rest: {
      type: restSchema,
    },
    location: {
      type: String,
      enum: LOCATION_LIST,
      default: '수원',
    },
  },
  {
    timestamps: true,
  },
);
export const Request =
  (mongoose.models.Request as Model<IRequestData, {}, {}, {}>) ||
  model<IRequestData>('Request', RequestSchema);
