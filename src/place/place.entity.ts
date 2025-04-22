import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { IUser } from 'src/user/user.entity';
import { z } from 'zod';

export const reviewSchema = z.object({
  userId: z.string(),
  comment: z.string(),
});

export const PlaceZodSchema = z.object({
  status: z.string(),
  fullname: z.string(),
  brand: z.string().optional(),
  branch: z.string().optional(),
  image: z.string().optional(),
  coverImage: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  priority: z.number().optional(),
  _id: z.string().optional(),
  locationDetail: z.string().optional(),
  time: z.string().optional(),
  registerDate: z.string().optional(),
  registrant: z.union([z.string(), z.custom<IUser>()]),
  mapURL: z.string(),
  reviews: z.array(reviewSchema).optional(),
  prefCnt: z.number().optional(),
});

export type IReview = z.infer<typeof reviewSchema> & Document;
export type IPlace = z.infer<typeof PlaceZodSchema> & Document;

export const ReviewSchema: Schema<IReview> = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
    timestamps: true,
  },
);

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
  reviews: {
    type: [ReviewSchema],
  },
});

export const Place =
  (mongoose.models.Place as Model<IPlace, {}, {}, {}>) ||
  model<IPlace>('Place', PlaceSchema);
