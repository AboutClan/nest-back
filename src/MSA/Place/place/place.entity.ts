import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { IUser } from 'src/MSA/User/entity/user.entity';
import { z } from 'zod';

export const ReviewZodSchema = z.object({
  user: z.union([z.string(), z.custom<IUser>()]),
  review: z.string(),
  rating: z.number(),
  isSecret: z.boolean(),
  isFixed: z.boolean(),
});

export const LocationZodSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  address: z.string(),
  name: z.string(),
});

export const PlaceZodSchema = z.object({
  status: z.enum(ENTITY.PLACE.ENUM_STATUS),
  location: LocationZodSchema,
  image: z.string().optional(),
  coverImage: z.string().optional(),
  registerDate: z.string(),
  prefCnt: z.number().optional().default(0),
  reviews: z.array(ReviewZodSchema).optional(),
  rating: z.number().optional(),
  registrant: z.union([z.string(), z.custom<IUser>()]),
  _id: z.string().optional(),
});

export type ReviewType = z.infer<typeof ReviewZodSchema> & Document;
export type IPlace = z.infer<typeof PlaceZodSchema> & Document;
export type LocationType = z.infer<typeof LocationZodSchema>;

export const locationSchema: Schema<LocationType> = new Schema(
  {
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  { _id: false, timestamps: false },
);

export const ReviewZReviewZodSchema: Schema<ReviewType> = new Schema(
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

  image: {
    type: String,
  },
  coverImage: {
    type: String,
  },
  location: {
    type: locationSchema,
    required: true,
  },

  registerDate: {
    type: String,
  },
  prefCnt: {
    type: Number,
    default: 0,
  },
  reviews: {
    type: [ReviewZReviewZodSchema],
  },
  rating: {
    type: Number,
    default: null,
  },
  registrant: {
    type: Schema.Types.ObjectId,
    ref: DB_SCHEMA.USER,
  },
});

export const Place =
  (mongoose.models.Place as Model<IPlace, {}, {}, {}>) ||
  model<IPlace>(DB_SCHEMA.PLACE, PlaceSchema);
