import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { LOCATION_LIST } from 'src/constants';
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
  registrant: z.union([z.string(), z.custom<IUser>()]),
  mapURL: z.string(),
  prefCnt: z.number().optional(),
});

export type IPlace = z.infer<typeof PlaceZodSchema> & Document;

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
    type: String,
    required: true,
  },
  longitude: {
    type: String,
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
    enum: LOCATION_LIST,
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
