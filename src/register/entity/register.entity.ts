import mongoose, { Document, model, Model, Schema } from 'mongoose';
import {
  locationSchema,
  LocationZodSchema,
} from 'src/gather/entity/gather.entity';
import { z } from 'zod';

export const MajorZodSchema = z.object({
  department: z.string(),
  detail: z.string(),
});
export const InterestZodSchema = z.object({
  first: z.string(),
  second: z.string().nullable(),
});
export const RegisteredZodSchema = z.object({
  uid: z.string(),
  name: z.string(),
  location: z.string(),
  mbti: z.string().optional(),
  gender: z.string(),
  profileImage: z.string().optional(),
  birth: z.string(),
  comment: z.string(),
  majors: z.array(MajorZodSchema).default([]),
  interests: InterestZodSchema.optional(),
  telephone: z.string(),
  locationDetail: LocationZodSchema.optional(),
});

export type IMajor = z.infer<typeof MajorZodSchema>;
export type IInterest = z.infer<typeof InterestZodSchema>;
export type IRegistered = z.infer<typeof RegisteredZodSchema> & Document;

export const InterestSchema: Schema<IInterest> = new Schema(
  {
    first: String,
    second: String,
  },
  { _id: false, timestamps: false, strict: false },
);

export const MajorSchema: Schema<IMajor> = new Schema(
  {
    department: String,
    detail: String,
  },
  { _id: false, timestamps: false, strict: false },
);

export const RegisteredSchema: Schema<IRegistered> = new Schema(
  {
    uid: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    majors: {
      type: [MajorSchema],
      required: true,
    },
    interests: {
      type: InterestSchema,
      required: true,
    },
    telephone: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    mbti: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
      required: true,
    },
    birth: {
      type: String,
      required: true,
    },
    locationDetail: {
      type: locationSchema,
      required: true,
    },
  },
  { timestamps: true },
);

export const Registered =
  (mongoose.models.REgistered as Model<IRegistered, {}, {}, {}>) ||
  model<IRegistered>('Registered', RegisteredSchema);
