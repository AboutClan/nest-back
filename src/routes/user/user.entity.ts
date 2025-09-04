import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { IPlace } from 'src/routes/place/place.entity';
import {
  ILocationDetail,
  InterestSchema,
  IRegistered,
  MajorSchema,
} from 'src/routes/register/register.entity';
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

const temperatureZodSchema = z.object({
  temperature: z.number().default(ENTITY.USER.DEAFULT_TEMPERATURE),
  sum: z.number().default(0),
  cnt: z.number().default(0),
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
  gatherTicket: z.number().default(ENTITY.USER.DEFAULT_GATHER_TICKET),
  groupStudyTicket: z.number().default(ENTITY.USER.DEFAULT_GROUPSTUDY_TICKET),
});

const badgeZodSchema = z
  .object({
    badgeIdx: z.number(),
    badgeList: z.array(z.string()),
  })
  .optional();

const rankZodSchema = z
  .object({
    num: z.number(),
    medal: z.string(),
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
export type temperatureType = z.infer<typeof temperatureZodSchema>;

// IUser Zod schema
export const userZodSchema = z.object({
  uid: z.string(),
  name: z.string(),
  location: z
    .enum(ENTITY.USER.ENUM_LOCATION)
    .default(ENTITY.USER.DEFAULT_LOCATION),
  mbti: z.string().default(''),
  gender: z.string().default(''),
  belong: z.string().optional(),
  profileImage: z.string().default(ENTITY.USER.DEAFULT_IMAGE).optional(),
  registerDate: z.string().default(''),
  isActive: z.boolean().default(false).optional(),
  birth: z.string().default(''),
  role: z
    .enum(ENTITY.USER.ENUM_ROLE)
    .default(ENTITY.USER.DEFAULT_ROLE)
    .optional(),
  rank: z
    .enum(ENTITY.USER.ENUM_RANK)
    .default(ENTITY.USER.DEFAULT_RANK)
    .optional(),
  rankPosition: z.number(),
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
  comment: z.string().default(ENTITY.USER.DEFAULT_COMMENT),
  rest: restZodSchema,
  avatar: avatarZodSchema,
  deposit: z.number().default(ENTITY.USER.DEFAULT_DEPOSIT),
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
  temperature: z.number().default(ENTITY.USER.DEAFULT_TEMPERATURE),
  introduceText: z.string(),
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
  temperature: temperatureType;
  introduceText: string;
  rank: string;
  rankPosition: number;
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
    name: String,
    address: String,
    latitude: Number,
    longitude: Number,
  },
  { timestamps: false, _id: false },
);

//Todo: Error
export const preferenceSchema: Schema<preferenceType> = new Schema(
  {
    subPlace: {
      type: [Schema.Types.ObjectId],
      ref: DB_SCHEMA.PLACE,
    },
    place: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.PLACE,
    },
  },
  {
    _id: false,
    timestamps: false,
  },
);

export const temperatureSchema: Schema<temperatureType> = new Schema(
  {
    temperature: {
      type: Schema.Types.Number,
      default: ENTITY.USER.DEAFULT_TEMPERATURE,
    },
    cnt: {
      type: Schema.Types.Number,
      default: 0,
    },
    sum: {
      type: Schema.Types.Number,
      default: 0,
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
      default: ENTITY.USER.DEFAULT_GATHER_TICKET,
    },
    groupStudyTicket: {
      type: Number,
      default: ENTITY.USER.DEFAULT_GROUPSTUDY_TICKET,
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
export const rankSchema: Schema<badgeType> = new Schema(
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
    enum: ENTITY.USER.ENUM_LOCATION,
    default: ENTITY.USER.DEFAULT_LOCATION,
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
    default: ENTITY.USER.DEAFULT_IMAGE,
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
  rank: {
    type: String,
    default: ENTITY.USER.DEFAULT_RANK,
  },
  rankPosition: Number,
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
    enum: ENTITY.USER.ENUM_ROLE,
    default: ENTITY.USER.DEFAULT_ROLE,
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
    default: ENTITY.USER.DEFAULT_COMMENT,
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
    default: ENTITY.USER.DEFAULT_DEPOSIT,
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
    default: () => ({
      gatherTicket: ENTITY.USER.DEFAULT_GATHER_TICKET,
      groupStudyTicket: ENTITY.USER.DEFAULT_GROUPSTUDY_TICKET,
    }),
  },
  badge: {
    type: badgeSchema,
    default: () => ({ badgeIdx: 0, badgeList: [] }),
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
  temperature: {
    type: temperatureSchema,
  },
  introduceText: {
    type: String,
  },
});

export const User =
  (mongoose.models.User as Model<IUser, {}, {}, {}>) ||
  model<IUser>(DB_SCHEMA.USER, UserSchema);
