import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { LOCATION_LIST } from 'src/Constants/constants';
import { IPlace } from 'src/place/place.entity';
import {
  ILocationDetail,
  InterestSchema,
  IRegistered,
  MajorSchema,
} from 'src/register/register.entity';
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
  place: z.union([z.string(), z.custom<IPlace>()]), // Assuming IPlace type should be replaced or handled properly
  subPlace: z.union([z.array(z.string()), z.array(z.custom<IPlace>())]), // Replace z.any() with IPlace if necessary
});

const ticketZodSchema = z.object({
  gatherTicket: z.number().default(2),
  groupStudyTicket: z.number().default(4),
});

const badgeZodSchema = z
  .object({
    badgeIdx: z.number(),
    badgeList: z.array(z.string()),
  })
  .optional();

const studyRecordZodSchema = z
  .object({
    accumulationMinutes: z.number(),
    accumulationCnt: z.number(),
    monthCnt: z.number(),
    monthMinutes: z.number(),
  })
  .optional();

export type restType = z.infer<typeof restZodSchema>;
export type avatarType = z.infer<typeof avatarZodSchema>;
export type preferenceType = z.infer<typeof preferenceZodSchema>;
export type ticketType = z.infer<typeof ticketZodSchema>;
export type badgeType = z.infer<typeof badgeZodSchema>;
export type studyRecordType = z.infer<typeof studyRecordZodSchema>;

// IUser Zod schema
export const userZodSchema = z.object({
  uid: z.string(),
  name: z.string(),
  location: z.enum(LOCATION_LIST).default('수원'),
  mbti: z.string().default(''),
  gender: z.string().default(''),
  belong: z.string().optional(),
  profileImage: z
    .string()
    .default(
      'https://user-images.githubusercontent.com/48513798/173180642-8fc5948e-a437-45f3-91d0-3f0098a38195.png',
    )
    .optional(),
  registerDate: z.string().default(''),
  isActive: z.boolean().default(false).optional(),
  birth: z.string().default(''),
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
    .default('member')
    .optional(),
  score: z.number().default(0),
  monthScore: z.number().default(0),
  point: z.number().default(0),
  majors: z.array(z.any()).default([]), // Replace z.any() with appropriate MajorSchema if necessary
  interests: z
    .object({
      first: z.string().optional(),
      second: z.string().optional(),
    })
    .default({ first: '', second: '' }), // Assuming InterestSchema
  locationDetailSchema: z.object({
    text: z.string(),
    lat: z.number(),
    lon: z.number(),
  }),
  telephone: z.string().default(''),
  comment: z.string().default('안녕하세요! 잘 부탁드립니다~!'),
  rest: restZodSchema,
  avatar: avatarZodSchema,
  deposit: z.number().default(3000),
  friend: z.array(z.string()).default([]),
  like: z.number().default(0),
  isPrivate: z.boolean().default(false).optional(),
  instagram: z.string().default('').optional(),
  studyPreference: preferenceZodSchema.optional(),
  weekStudyTragetHour: z.number().default(0),
  weekStudyAccumulationMinutes: z.number().default(0),
  ticket: ticketZodSchema,
  badge: badgeZodSchema,
  isLocationSharingDenided: z.boolean().default(false).optional(),
});

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
  ticket: ticketType;
  badge: badgeType;
  monthStudyTarget: number;
  studyRecord: studyRecordType;
  isLocationSharingDenided: boolean;
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

export const locationDetailSchema: Schema<ILocationDetail> = new Schema(
  {
    text: String,
    lat: Number,
    lon: Number,
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

export const ticketSchema: Schema<ticketType> = new Schema(
  {
    gatherTicket: {
      type: Number,
      default: 2,
    },
    groupStudyTicket: {
      type: Number,
      default: 4,
    },
  },
  {
    _id: false,
  },
);

export const studyRecordSchema: Schema<studyRecordType> = new Schema(
  {
    accumulationMinutes: { type: Number, default: 0 },
    accumulationCnt: { type: Number, default: 0 },
    monthMinutes: { type: Number, default: 0 },
    monthCnt: { type: Number, default: 0 },
  },
  {
    _id: false,
    timestamps: false,
  },
);
export const badgeSchema: Schema<badgeType> = new Schema(
  {
    badgeIdx: Number,
    badgeList: [String],
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
    enum: LOCATION_LIST,
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
  monthStudyTarget: {
    type: Number,
  },
  isLocationSharingDenided: {
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
  locationDetail: { type: locationDetailSchema },

  ticket: {
    type: ticketSchema,
    default: () => ({ gatherTicket: 2, groupStudyTicket: 4 }),
  },
  badge: {
    type: badgeSchema,
    default: () => ({ badgeIdx: null, badgeList: [] }),
  },
  studyRecord: {
    type: studyRecordSchema,
    default: () => ({
      accumulationMinutes: 0,
      accumulationCnt: 0,
      monthCnt: 0,
      monthMinutes: 0,
    }),
  },
});

export const User =
  (mongoose.models.User as Model<IUser, {}, {}, {}>) ||
  model<IUser>('User', UserSchema);
