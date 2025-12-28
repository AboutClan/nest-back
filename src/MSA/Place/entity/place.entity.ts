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

export const ratingDetailZodSchema = z.object({
  user: z.union([z.string(), z.custom<IUser>()]),
  rating: z.number(),
});

export const ratingZodSchema = z.object({
  mood: z.array(ratingDetailZodSchema).optional(),
  table: z.array(ratingDetailZodSchema).optional(),
  beverage: z.array(ratingDetailZodSchema).optional(),
  etc: z.array(ratingDetailZodSchema).optional(),
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
  ratings: ratingZodSchema.optional(),
  registrant: z.union([z.string(), z.custom<IUser>()]),
  _id: z.string().optional(),
});

export type ReviewType = z.infer<typeof ReviewZodSchema> & Document;
export type IPlace = z.infer<typeof PlaceZodSchema> & Document;
export type LocationType = z.infer<typeof LocationZodSchema>;
export type ratingType = z.infer<typeof ratingZodSchema>;
export type ratingDetailType = z.infer<typeof ratingDetailZodSchema>;

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

export const ratingDetailSchema: Schema<ratingDetailType> = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: DB_SCHEMA.USER,
  },
  rating: {
    type: Number,
  },
});

export const ratingSchema: Schema<ratingType> = new Schema(
  {
    mood: {
      type: [ratingDetailSchema],
      default: [],
    },
    table: {
      type: [ratingDetailSchema],
      default: [],
    },
    beverage: {
      type: [ratingDetailSchema],
      default: [],
    },
    etc: {
      type: [ratingDetailSchema],
      default: [],
    },
  },
  { _id: false, timestamps: false },
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
  ratings: {
    type: ratingSchema,
  },
});

export const Place =
  (mongoose.models.Place as Model<IPlace, {}, {}, {}>) ||
  model<IPlace>(DB_SCHEMA.PLACE, PlaceSchema);
