import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { IUser } from 'src/MSA/User/entity/user.entity';
import { z } from 'zod';

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
  mood: z.number().optional().default(0),
  table: z.number().optional().default(0),
  space: z.number().optional().default(0),
  etc: z.number().optional().default(0),
  comment: z.string().optional().default(''),
  user: z.union([z.string(), z.custom<IUser>()]),
});

export const PlaceZodSchema = z.object({
  status: z.enum(ENTITY.PLACE.ENUM_STATUS),
  location: LocationZodSchema,
  image: z.string().optional(),
  coverImage: z.string().optional(),
  registerDate: z.string(),
  prefCnt: z.number().optional().default(0),
  rating: z.number().optional(),
  ratings: z.array(ratingZodSchema).optional(),
  registrant: z.union([z.string(), z.custom<IUser>()]),
  _id: z.string().optional(),
});

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

export const ratingSchema: Schema<ratingType> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    mood: {
      type: Number,
      default: 0,
    },
    table: {
      type: Number,
      default: 0,
    },
    space: {
      type: Number,
      default: 0,
    },
    etc: {
      type: Number,
      default: 0,
    },
    comment: {
      type: String,
      default: '',
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
  rating: {
    type: Number,
    default: null,
  },
  registrant: {
    type: Schema.Types.ObjectId,
    ref: DB_SCHEMA.USER,
  },
  ratings: {
    type: [ratingSchema],
    default: [],
  },
});

export const Place =
  (mongoose.models.Place as Model<IPlace, {}, {}, {}>) ||
  model<IPlace>(DB_SCHEMA.PLACE, PlaceSchema);
