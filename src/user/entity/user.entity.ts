import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { IPlace } from 'src/place/entity/place.entity';
import {
  InterestSchema,
  IRegistered,
  MajorSchema,
} from 'src/register/entity/register.entity';
import { z } from 'zod';

// restType Zod schema
const restZodSchema = z.object({
  type: z.string(),
  startDate: z.instanceof(Date),
  endDate: z.instanceof(Date),
  content: z.string(),
  restCnt: z.number().default(0),
  cumulativeSum: z.number().default(0),
});

// avatarType Zod schema
const avatarZodSchema = z.object({
  type: z.number().default(1),
  bg: z.number().default(1),
});

// preferenceType Zod schema
const preferenceZodSchema = z.object({
  place: z.union([z.string(), z.any()]), // Assuming IPlace type should be replaced or handled properly
  subPlace: z.union([z.array(z.string()), z.array(z.any())]), // Replace z.any() with IPlace if necessary
});

// IUser Zod schema
const userZodSchema = z.object({
  uid: z.string(),
  name: z.string(),
  location: z
    .enum(['수원', '양천', '안양', '강남', '동대문', '인천'])
    .default('수원'),
  mbti: z.string().default(''),
  gender: z.string().default(''),
  belong: z.string().optional(),
  profileImage: z
    .string()
    .default(
      'https://user-images.githubusercontent.com/48513798/173180642-8fc5948e-a437-45f3-91d0-3f0098a38195.png',
    ),
  registerDate: z.string().default(''),
  isActive: z.boolean().default(false),
  birth: z.string().default(''),
  isPrivate: z.boolean().default(false),
  role: z
    .enum([
      'noMember',
      'waiting',
      'human',
      'member',
      'manager',
      'previliged',
      'resting',
      'enthusiastic',
    ])
    .default('member'),
  score: z.number().default(0),
  monthScore: z.number().default(0),
  point: z.number().default(0),
  comment: z.string().default('안녕하세요! 잘 부탁드립니다~!'),
  rest: restZodSchema,
  avatar: avatarZodSchema,
  majors: z.array(z.any()).default([]), // Replace z.any() with appropriate MajorSchema if necessary
  interests: z
    .object({
      first: z.string().optional(),
      second: z.string().optional(),
    })
    .default({ first: '', second: '' }), // Assuming InterestSchema
  telephone: z.string().default(''),
  deposit: z.number().default(3000),
  friend: z.array(z.string()).default([]),
  like: z.number().default(0),
  instagram: z.string().default(''),
  studyPreference: preferenceZodSchema.optional(),
  weekStudyTragetHour: z.number().default(0),
  weekStudyAccumulationMinutes: z.number().default(0),
});

export interface restType {
  type: string;
  startDate: Date;
  endDate: Date;
  content: string;
  restCnt: number;
  cumulativeSum: number;
}

export interface avatarType {
  type: number;
  bg: number;
}

export interface preferenceType {
  place: string | IPlace;
  subPlace: string[] | IPlace[];
}

export interface IUser extends Document, IRegistered {
  _id: string;
  registerDate: string;
  isActive?: boolean;
  point: number;
  role?: string;
  score: number;
  comment: string;
  rest: restType;
  avatar: avatarType;
  deposit: number;
  studyPreference: preferenceType;
  friend: string[];
  like: number;
  belong?: string;
  monthScore: number;
  isPrivate?: boolean;
  instagram?: string;
  weekStudyTragetHour: number;
  weekStudyAccumulationMinutes: number;
}

export const restSchema: Schema<restType> = new Schema(
  {
    type: Schema.Types.String,
    startDate: Schema.Types.Date,
    endDate: Schema.Types.Date,
    content: Schema.Types.String,
    restCnt: {
      type: Schema.Types.Number,
      default: 0,
    },
    cumulativeSum: {
      type: Schema.Types.Number,
      default: 0,
    },
  },
  { timestamps: false },
);

export const avatarSchema: Schema<avatarType> = new Schema(
  {
    type: {
      type: Schema.Types.Number,
      default: 1,
    },
    bg: {
      type: Schema.Types.Number,
      default: 1,
    },
  },
  { timestamps: false, _id: false },
);

//Todo: Error
export const preferenceSchema: Schema<preferenceType> = new Schema(
  {
    subPlace: {
      type: [Schema.Types.ObjectId],
      ref: 'Place',
    },
    place: {
      type: Schema.Types.ObjectId,
      ref: 'Place',
    },
  },
  {
    _id: false,
    timestamps: false,
  },
);

export const UserSchema: Schema<IUser> = new Schema({
  uid: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    enum: ['수원', '양천', '안양', '강남', '동대문', '인천'],
    default: '수원',
  },
  mbti: {
    type: String,
    default: '',
  },
  gender: {
    type: String,
    default: '',
  },
  belong: {
    type: String,
  },
  profileImage: {
    type: String,
    default:
      'https://user-images.githubusercontent.com/48513798/173180642-8fc5948e-a437-45f3-91d0-3f0098a38195.png',
  },
  registerDate: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  birth: {
    type: String,
    default: '',
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: [
      'noMember',
      'waiting',
      'human',
      'member',
      'manager',
      'previliged',
      'resting',
      'enthusiastic',
    ],
    default: 'member',
  },
  score: {
    type: Number,
    default: 0,
  },
  monthScore: {
    type: Number,
    default: 0,
  },
  point: {
    type: Number,
    default: 0,
  },
  comment: {
    type: String,
    default: '안녕하세요! 잘 부탁드립니다~!',
  },
  rest: restSchema,
  avatar: avatarSchema,
  majors: {
    type: [MajorSchema],
    default: [],
  },
  interests: {
    type: InterestSchema,
    default: { first: '', second: '' },
  },
  telephone: {
    type: String,
    default: '',
  },
  deposit: {
    type: Number,
    default: 3000,
  },
  friend: {
    type: [String],
    default: [],
  },
  like: {
    type: Number,
    default: 0,
  },
  instagram: {
    type: String,
    default: '',
  },
  studyPreference: {
    type: preferenceSchema,
  },
  weekStudyTragetHour: { type: Number, default: 0 },
  weekStudyAccumulationMinutes: { type: Number, default: 0 },
});

export const User =
  (mongoose.models.User as Model<IUser, {}, {}, {}>) ||
  model<IUser>('User', UserSchema);
