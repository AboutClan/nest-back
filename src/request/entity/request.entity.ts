import { Dayjs, isDayjs } from 'dayjs';
import mongoose, { model, Model, Schema } from 'mongoose';
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
  writer: z.string(),
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
  | '장소 추가';

export type RequestLocation =
  | '수원'
  | '양천'
  | '안양'
  | '강남'
  | '동대문'
  | '인천'
  | '마포'
  | '성남'
  | '성동'
  | '고양'
  | '중구'
  | '송파'
  | '구로'
  | '동작'
  | '강북'
  | '부천'
  | '시흥'
  | '기타';

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
        '탈퇴',
        '출석',
        '배지',
        '불참',
        '조모임',
        '장소 추가',
      ],
    },
    title: {
      type: String,
    },
    writer: {
      type: String,
    },
    content: {
      type: String,
    },
    rest: {
      type: restSchema,
    },
    location: {
      type: String,
      enum: [
        '수원',
        '양천',
        '안양',
        '강남',
        '동대문',
        '인천',
        '마포',
        '성남',
        '성동',
        '고양',
        '중구',
        '송파',
        '구로',
        '동작',
        '강북',
        '부천',
        '시흥',
        '기타',
      ],
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
