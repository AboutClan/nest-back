import { Dayjs, isDayjs } from 'dayjs';
import mongoose, { model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
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
      enum: ENTITY.REQUEST.ENUM_REST,
    },
    start: Date,
    end: Date,
  },
  { _id: false },
);

export type RequestCategory = (typeof ENTITY.REQUEST.ENUM_CATEGORY)[number];
export type RequestLocation = (typeof ENTITY.USER.ENUM_LOCATION)[number];

export const RequestSchema: Schema<IRequestData> = new Schema(
  {
    category: {
      type: String,
      enum: ENTITY.REQUEST.ENUM_CATEGORY,
    },
    title: {
      type: String,
    },
    writer: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    content: {
      type: String,
    },
    rest: {
      type: restSchema,
    },
    location: {
      type: String,
      enum: ENTITY.USER.ENUM_LOCATION,
      default: '수원',
    },
  },
  {
    timestamps: true,
  },
);
export const Request =
  (mongoose.models.Request as Model<IRequestData, {}, {}, {}>) ||
  model<IRequestData>(DB_SCHEMA.REQUEST, RequestSchema);
