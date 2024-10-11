import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { IUser } from 'src/user/entity/user.entity';
import { z } from 'zod';

export const PlaceZodSchema = z.object({
  status: z.string(),
  fullname: z.string(),
  brand: z.string().optional(),
  branch: z.string().optional(),
  image: z.string().optional(),
  coverImage: z.string().optional(),
  latitude: z.string(),
  longitude: z.string(),
  priority: z.number().optional(),
  _id: z.string().optional(),
  location: z.string(),
  locationDetail: z.string().optional(),
  time: z.string().optional(),
  registerDate: z.string().optional(),
  registrant: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  mapURL: z.string(),
  prefCnt: z.number().optional(),
});

export interface IPlace extends Document {
  status: string;
  fullname: string;
  brand?: string;
  branch?: string;
  image?: string;
  coverImage?: string;
  latitude: number;
  longitude: number;
  priority?: number;
  _id: string;
  location: string;
  locationDetail?: string;
  time?: string;
  registerDate: string;
  registrant: string | IUser;
  mapURL: string;
  prefCnt: number;
}

export const PlaceSchema: Schema<IPlace> = new Schema({
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active',
  },
  fullname: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    required: true,
  },
  branch: String,
  image: String,
  coverImage: String,

  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  locationDetail: {
    type: String,
  },
  time: {
    type: String,
  },
  priority: Number,
  location: {
    type: String,
    enum: ['수원', '양천', '강남', '동대문', '안양', '인천', '전체'],
    default: '수원',
  },
  registerDate: {
    type: String,
  },
  registrant: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  mapURL: {
    type: String,
  },
  prefCnt: {
    type: Number,
    default: 0,
  },
});

export const Place =
  (mongoose.models.Place as Model<IPlace, {}, {}, {}>) ||
  model<IPlace>('Place', PlaceSchema);
