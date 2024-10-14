import mongoose, { Document, Model, ObjectId, Schema } from 'mongoose';
import { IUser } from 'src/user/entity/user.entity';
import { z } from 'zod';

const PlaceSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  name: z.string(),
  address: z.string(),
});

const TimeSchema = z.object({
  start: z.string(), // ISO Date String
  end: z.string(), // ISO Date String
});

export const RealtimeUserZodSchema = z.object({
  user: z.custom<Schema.Types.ObjectId>(),
  place: PlaceSchema,
  arrived: z.date().optional(), // ISO Date String
  image: z.custom<Buffer[]>().optional(),
  memo: z.string().optional(),
  comment: z.object({ text: z.string() }).optional(),
  status: z.enum(['pending', 'solo', 'open', 'free', 'cancel']).default('solo'),
  time: TimeSchema,
});

export const RealtimeAttZodSchema = z.object({
  image: z.custom<Buffer[]>(),
  memo: z.string().optional(),
  status: z.enum(['pending', 'solo', 'open', 'free', 'cancel']),
});

export interface IPlace {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
  _id?: string;
}

export interface ITime {
  start: string;
  end: string;
}

export interface IComment {
  text: string;
}

export interface IRealtimeUser {
  user?: ObjectId | IUser;
  place: IPlace;
  arrived?: Date;
  image?: string[] | Buffer[];
  memo?: string;
  comment?: IComment;
  status: 'pending' | 'solo' | 'open' | 'free' | 'cancel';
  time: ITime;
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
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  place: { type: placeSchema, required: true },
  arrived: { type: Date },
  image: { type: [String] },
  memo: { type: String },
  comment: commentSchema,
  status: {
    type: String,
    enum: ['pending', 'solo', 'open', 'free', 'cancel'],
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
  mongoose.model<IRealtime>('Realtime', RealtimeSchema);
