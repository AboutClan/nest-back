import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { IUser } from 'src/MSA/User/entity/user.entity';
import { z } from 'zod';

export type gatherStatus = 'pending' | 'open' | 'close' | 'end';

export const TimeZodSchema = z.object({
  hours: z.number().nullable().optional(),
  minutes: z.number().nullable().optional(),
});
export const WaitingZodSchema = z.object({
  user: z.union([z.string(), z.custom<IUser>()]),
  phase: z.string(),
  createdAt: z.date().nullable().optional(),
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
  user: z.union([z.string(), z.custom<IUser>()]).optional(),
  phase: z.string(),
  invited: z.boolean().default(false),
  absence: z.boolean().default(false),
  // 도메인 GATHER_ABSENCE_TYPES와 같은 값. 없으면 유형 없이 불참만 표시된 예전 데이터다.
  absenceType: z.enum(['normal', 'noshow', 'nomanner']).optional(),
  withCompanion: z.boolean().default(false),
  isDummy: z.boolean().default(false),
  dummyId: z.string().optional(),
  dummyName: z.string().optional(),
  dummyGender: z.string().optional(),
  dummyBirth: z.string().optional(),
});

export const DateOptionZodSchema = z.object({
  date: z.string(),
  voters: z.array(z.union([z.string(), z.custom<IUser>()])).default([]),
});

// 상시 행사(regularGather)의 일정. 매주 반복이면 weekday, 특정 날짜면 date(YYYY-MM-DD).
// contentKey가 있으면 그 콘텐츠 전용 일정, 없으면 콘텐츠와 무관한 공통 일정이다.
// key는 구글폼 집계(formStats.byOption)의 키와 같다.
export const RegularSlotZodSchema = z.object({
  key: z.string(),
  weekday: z.number().optional(),
  date: z.string().optional(),
  time: z.string(),
  contentKey: z.string().optional(),
});

// 상시 행사의 콘텐츠 라인업. 수시로 교체된다. location이 없으면 행사 공통 location을 쓴다.
export const RegularContentZodSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string().optional(),
  url: z.string().optional(),
  badge: z.string().optional(),
  location: LocationZodSchema.optional(),
});

// 상시 행사 구글폼 신청 집계. Apps Script가 POST /gather/regular/form-stats로 통째로 덮어쓴다.
// roundKey는 그 주 월요일(KST) 'YYYY-MM-DD'. byOption은 slot·content key별 선택 수(복수 선택).
export const FormStatsZodSchema = z.object({
  roundKey: z.string(),
  total: z.number(),
  byOption: z.record(z.string(), z.number()).default({}),
  applicants: z.array(z.any()).default([]),
  updatedAt: z.date(),
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
  googleFormUrl: z.string().nullable().optional(),
  waiting: z.array(WaitingZodSchema).default([]),
  isApprovalRequired: z.boolean().nullable().optional(),
  reviewers: z.array(z.string()).default([]),
  deposit: z.number().default(0),
  notionUrl: z.string(),
  category: z.enum(ENTITY.GATHER.ENUM_CATEGORY_TYPE),
  groupId: z.string().optional(),
  hasReview: z.boolean().optional().default(false),
  dateOptions: z.array(DateOptionZodSchema).optional().default([]),
  slots: z.array(RegularSlotZodSchema).optional(),
  contents: z.array(RegularContentZodSchema).optional(),
  formStats: FormStatsZodSchema.nullable().optional(),
  parentGatherId: z.number().nullable().optional(),
});

export type ITime = z.infer<typeof TimeZodSchema>;
export type IWaiting = z.infer<typeof WaitingZodSchema>;
export type TitleType = z.infer<typeof TitleZodSchema>;
export type LocationType = z.infer<typeof LocationZodSchema>;
export type memberCntType = z.infer<typeof MemberCntZodSchema>;
export type GatherType = z.infer<typeof GathersZodSchema>;
export type participantsType = z.infer<typeof ParticipantsZodSchema>;
export type dateOptionType = z.infer<typeof DateOptionZodSchema>;
export type regularSlotType = z.infer<typeof RegularSlotZodSchema>;
export type regularContentType = z.infer<typeof RegularContentZodSchema>;
export type formStatsType = z.infer<typeof FormStatsZodSchema>;
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
      required: false,
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
    absenceType: {
      type: String,
      enum: ['normal', 'noshow', 'nomanner'],
      required: false,
    },
    withCompanion: {
      type: Boolean,
      default: false,
    },
    isDummy: {
      type: Boolean,
      default: false,
    },
    dummyId: {
      type: String,
    },
    dummyName: {
      type: String,
    },
    dummyGender: {
      type: String,
    },
    dummyBirth: {
      type: String,
    },
  },
  { _id: false, timestamps: false },
);

export const dateOptionSchema: Schema<dateOptionType> = new Schema(
  {
    date: {
      type: String,
    },
    voters: {
      type: [Schema.Types.ObjectId],
      ref: DB_SCHEMA.USER,
      default: [],
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
    createdAt: {
      type: Date,
    },
  },
  { _id: false },
);

export const regularSlotSchema: Schema<regularSlotType> = new Schema(
  {
    key: { type: String },
    weekday: { type: Number },
    date: { type: String },
    time: { type: String },
    contentKey: { type: String },
  },
  { _id: false, timestamps: false },
);

export const regularContentSchema: Schema<regularContentType> = new Schema(
  {
    key: { type: String },
    title: { type: String },
    description: { type: String },
    url: { type: String },
    badge: { type: String },
    location: { type: locationSchema },
  },
  { _id: false, timestamps: false },
);

export const formStatsSchema: Schema<formStatsType> = new Schema(
  {
    roundKey: { type: String },
    total: { type: Number, default: 0 },
    byOption: { type: Schema.Types.Mixed, default: {} },
    // [{ gender, birthYear, keys, submittedAt }] 이번 주 신청자(익명)
    applicants: { type: Schema.Types.Mixed, default: [] },
    updatedAt: { type: Date },
  },
  { _id: false, timestamps: false },
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
    googleFormUrl: {
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
    hasReview: {
      type: Boolean,
      default: false,
    },
    dateOptions: {
      type: [dateOptionSchema],
      default: [],
    },
    slots: {
      type: [regularSlotSchema],
      default: undefined,
    },
    contents: {
      type: [regularContentSchema],
      default: undefined,
    },
    formStats: {
      type: formStatsSchema,
      required: false,
    },
    // 상시 행사에서 확정돼 따로 만든 모임이면 부모(상시 행사) gather의 id
    parentGatherId: {
      type: Number,
      required: false,
      default: null,
    },
  },
  { timestamps: true, strict: false },
);

export const Gather =
  (mongoose.models.Gather as Model<IGatherData, {}, {}, {}>) ||
  model<IGatherData>(DB_SCHEMA.GATHER, GatherSchema);
