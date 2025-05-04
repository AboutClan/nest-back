import mongoose, { Document, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { IUser } from 'src/routes/user/user.entity';
import { z } from 'zod';

const PlaceSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  name: z.string(),
  address: z.string(),
  _id: z.string().optional(),
});

const TimeSchema = z.object({
  start: z.string(), // ISO Date String
  end: z.string(), // ISO Date String
});

export const RealtimeUserZodSchema = z.object({
  user: z.union([z.string(), z.custom<IUser>()]),
  place: PlaceSchema,
  arrived: z.date().optional(), // ISO Date String
  image: z.union([z.custom<Buffer[]>(), z.string()]).optional(),
  memo: z.string().optional(),
  comment: z.object({ text: z.string() }).optional(),
  status: z.enum(['pending', 'solo', 'open', 'free', 'cancel']).default('solo'),
  time: TimeSchema,
  _id: z.string().optional(),
});

export const RealtimeAttZodSchema = z.object({
  image: z.custom<Buffer[]>(),
  memo: z.string().optional(),
  status: z.enum(['pending', 'solo', 'open', 'free', 'cancel']),
});

export type IPlace = z.infer<typeof PlaceSchema>;
export type ITime = z.infer<typeof TimeSchema>;
export type IRealtimeUser = z.infer<typeof RealtimeUserZodSchema>;

export interface IComment {
  text: string;
}

export interface IRealtime extends Document {
  date: Date;
  userList?: IRealtimeUser[];
}

const commentSchema: Schema<IComment> = new Schema(
  {
    text: {
      type: String,
      required: false,
    },
  },
  { _id: false, timestamps: true },
);

const placeSchema: Schema<IPlace> = new Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
});

const timeSchema: Schema<ITime> = new Schema({
  start: { type: String, required: true },
  end: { type: String, required: true },
});

const realtimeUserSchema: Schema<IRealtimeUser> = new Schema({
  user: { type: Schema.Types.ObjectId, ref: DB_SCHEMA.USER, required: true },
  place: { type: placeSchema, required: true },
  arrived: { type: Date },
  image: { type: String },
  memo: { type: String },
  comment: commentSchema,
  status: {
    type: String,
    enum: ['solo', 'free', 'cancel'],
    required: true,
  },
  time: { type: timeSchema, required: true },
});

export const RealtimeSchema: Schema<IRealtime> = new Schema({
  date: Date,
  userList: {
    type: [realtimeUserSchema],
    default: [],
  },
});

export const RealtimeModel: Model<IRealtime> =
  mongoose.models.Realtime ||
  mongoose.model<IRealtime>(DB_SCHEMA.REALTIME, RealtimeSchema);
