import mongoose, { model, Schema, Model, Document } from 'mongoose';
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
  mbti: z.string().optional(),
  gender: z.string(),
  profileImage: z.string().optional(),
  birth: z.string(),
  comment: z.string(),
  majors: z.array(MajorZodSchema).default([]),
  interests: InterestZodSchema.optional(),
  telephone: z.string(),
});

export interface IMajor {
  department: string;
  detail: string;
}

export interface IInterest {
  first: string;
  second: string;
}

export interface IRegistered extends Document {
  uid: string;
  name: string;
  location: string;
  mbti?: string;
  gender: string;
  profileImage: string;
  birth: string;
  comment: string;

  majors: IMajor[];
  interests: IInterest;
  telephone: string;
}

export const InterestSchema: Schema<IInterest> = new Schema(
  {
    first: String,
    second: String,
  },
  { _id: false, timestamps: true, strict: false },
);

export const MajorSchema: Schema<IMajor> = new Schema(
  {
    department: String,
    detail: String,
  },
  { _id: false, timestamps: true, strict: false },
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
  },
  { timestamps: true },
);

InterestSchema.set('timestamps', false);
MajorSchema.set('timestamps', false);
RegisteredSchema.set('timestamps', true);

export const Registered =
  (mongoose.models.REgistered as Model<IRegistered, {}, {}, {}>) ||
  model<IRegistered>('Registered', RegisteredSchema);
