import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { IUser } from 'src/routes/user/user.entity';
import { z } from 'zod';

export const reviewSchema = z.object({
  user: z.union([z.string(), z.custom<IUser>()]),
  review: z.string(),
  rating: z.number(),
  isSecret: z.boolean(),
  isFixed: z.boolean(),
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
    user: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    isSecret: {
      type: Boolean,
      required: true,
    },
    isFixed: {
      type: Boolean,
      default: false,
    },
    review: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
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
    enum: ENTITY.PLACE.ENUM_STATUS,
    default: ENTITY.PLACE.DEFAULT_STATUS,
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
    ref: DB_SCHEMA.USER,
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
  model<IPlace>(DB_SCHEMA.PLACE, PlaceSchema);
