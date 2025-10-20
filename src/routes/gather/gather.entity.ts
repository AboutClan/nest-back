import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { IUser } from 'src/routes/user/user.entity';
import { z } from 'zod';

export type gatherStatus = 'pending' | 'open' | 'close' | 'end';

export const TimeZodSchema = z.object({
  hours: z.number().nullable().optional(),
  minutes: z.number().nullable().optional(),
});
export const WaitingZodSchema = z.object({
  user: z.union([z.string(), z.custom<IUser>()]),
  phase: z.string(),
});
export const TitleZodSchema = z.object({
  title: z.string(),
  subtitle: z.string().nullable().optional(),
});

export const LocationZodSchema = z.object({
  main: z.string(),
  sub: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
export const MemberCntZodSchema = z.object({
  min: z.number(),
  max: z.number(),
});
export const GathersZodSchema = z.object({
  text: z.string(),
  time: TimeZodSchema,
});

export const ParticipantsZodSchema = z.object({
  user: z.union([z.string(), z.custom<IUser>()]),
  phase: z.string(),
  invited: z.boolean().default(false),
  absence: z.boolean().default(false),
});

export const GatherZodSchema = z.object({
  title: z.string(),
  type: TitleZodSchema,
  gatherList: z.array(GathersZodSchema),
  content: z.string(),
  location: LocationZodSchema,
  memberCnt: MemberCntZodSchema,
  age: z.array(z.number()).nullable().optional(),
  preCnt: z.number().nullable().optional(),
  genderCondition: z.boolean(),
  password: z.string().nullable().optional(),
  status: z
    .enum(ENTITY.GATHER.ENUM_STATUS)
    .default(ENTITY.GATHER.DEFAULT_STATUS),
  participants: z.array(ParticipantsZodSchema),
  user: z.union([z.string(), z.custom<IUser>()]),
  id: z.number(),
  date: z.string(),
  place: z.string().nullable().optional(),
  isAdminOpen: z.boolean().nullable().optional(),
  image: z.string().nullable().optional(),
  postImage: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  kakaoUrl: z.string().nullable().optional(),
  waiting: z.array(WaitingZodSchema).default([]),
  isApprovalRequired: z.boolean().nullable().optional(),
  reviewers: z.array(z.string()).default([]),
  deposit: z.number().default(0),
  notionUrl: z.string(),
  category: z.enum(ENTITY.GATHER.ENUM_CATEGORY_TYPE),
  groupId: z.string().optional(),
});

export type ITime = z.infer<typeof TimeZodSchema>;
export type IWaiting = z.infer<typeof WaitingZodSchema>;
export type TitleType = z.infer<typeof TitleZodSchema>;
export type LocationType = z.infer<typeof LocationZodSchema>;
export type memberCntType = z.infer<typeof MemberCntZodSchema>;
export type GatherType = z.infer<typeof GathersZodSchema>;
export type participantsType = z.infer<typeof ParticipantsZodSchema>;
export type IGatherData = z.infer<typeof GatherZodSchema> & Document;

export const typeSchema: Schema<TitleType> = new Schema(
  {
    title: {
      type: String,
    },
    subtitle: {
      type: String,
      required: false,
      default: null,
    },
  },
  { _id: false, timestamps: false },
);

export const timeSchema: Schema<ITime> = new Schema(
  {
    hours: {
      type: Number,
    },
    minutes: {
      type: Number,
    },
  },
  { _id: false, timestamps: false },
);

export const gatherListSchema: Schema<GatherType> = new Schema(
  {
    text: {
      type: String,
    },
    time: {
      type: timeSchema,
    },
  },
  { _id: false, timestamps: false },
);

export const locationSchema: Schema<LocationType> = new Schema(
  {
    main: {
      type: String,
    },
    sub: {
      type: String,
      default: '',
    },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { _id: false, timestamps: false },
);

export const memberCntSchema: Schema<memberCntType> = new Schema(
  {
    min: {
      type: Number,
    },
    max: {
      type: Number,
    },
  },
  { _id: false, timestamps: false },
);

export const participantsSchema: Schema<participantsType> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    phase: {
      type: String,
      enum: ENTITY.GATHER.ENUM_PART_PHASE,
    },
    invited: {
      type: Boolean,
      default: false,
    },
    absence: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false, timestamps: false },
);

export const waitingSchema: Schema<IWaiting> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    phase: {
      type: String,
    },
  },
  { _id: false },
);

export const GatherSchema: Schema<IGatherData> = new Schema(
  {
    title: {
      type: String,
    },
    gatherList: {
      type: [gatherListSchema],
    },
    type: {
      type: typeSchema,
    },
    content: {
      type: String,
    },
    location: {
      type: locationSchema,
    },
    memberCnt: {
      type: memberCntSchema,
    },
    age: {
      type: [Number],
    },
    preCnt: {
      type: Number,
    },
    genderCondition: {
      type: Boolean,
    },
    password: {
      type: String,
    },
    participants: {
      type: [participantsSchema],
      ref: DB_SCHEMA.USER,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    status: {
      type: String,
      enum: ENTITY.GATHER.ENUM_STATUS,
      default: ENTITY.GATHER.DEFAULT_STATUS,
      required: true,
    },
    id: {
      type: Number,
      default: 0,
    },
    date: {
      type: String,
    },
    waiting: {
      type: [waitingSchema],
      ref: DB_SCHEMA.USER,
      default: [],
    },
    place: {
      type: String,
      enum: ENTITY.USER.ENUM_LOCATION,
    },
    isAdminOpen: {
      type: Boolean,
    },
    image: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    postImage: {
      type: String,
    },
    kakaoUrl: {
      type: String,
    },
    isApprovalRequired: {
      type: Boolean,
    },
    reviewers: {
      type: [String],
    },
    deposit: {
      type: Number,
      default: 0,
    },
    notionUrl: {
      type: String,
    },
    category: {
      type: String,
      enum: ENTITY.GATHER.ENUM_CATEGORY_TYPE,
      default: ENTITY.GATHER.DEFAULT_CATEGORY_TYPE,
    },
    groupId: {
      type: String,
      default: null,
      required: false,
    },
  },
  { timestamps: true, strict: false },
);

export const Gather =
  (mongoose.models.Gather as Model<IGatherData, {}, {}, {}>) ||
  model<IGatherData>(DB_SCHEMA.GATHER, GatherSchema);
