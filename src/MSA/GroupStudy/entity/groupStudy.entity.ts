import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { IUser } from 'src/MSA/User/entity/user.entity';
import { z } from 'zod';

// UserRole enum
const userRoleZodSchema = z.enum(ENTITY.GROUPSTUDY.ENUM_USER_ROLE);

// ICategory Zod schema
const categoryZodSchema = z.object({
  main: z.string(),
  sub: z.string(),
});

// memberCntType Zod schema
const memberCntZodSchema = z.object({
  min: z.number(),
  max: z.number(),
});

// participantsType Zod schema
const participantsZodSchema = z.object({
  user: z.union([z.string(), z.custom<IUser>()]),
  randomId: z.number().optional(),
  role: userRoleZodSchema,
  monthAttendance: z.boolean().default(true),
  lastMonthAttendance: z.boolean().default(true),
  deposit: z.number().optional(),
  createdAt: z.date(),
  status: z.enum(["active", "rest", "warning"]).default("active"),
});
// IWaiting Zod schema
const waitingZodSchema = z.object({
  user: z.union([z.string(), z.custom<IUser>()]), // IUser type should be handled appropriately
  answer: z.array(z.string()).optional(),
  pointType: z.string(),
  createdAt: z.date().optional(),
});

// IWeekRecord Zod schema
const weekRecordZodSchema = z.object({
  uid: z.string(),
  name: z.string(),
  attendRecord: z.array(z.string()),
  attendRecordSub: z.array(z.string()).optional(),
});

// IAttendance Zod schema
const attendanceZodSchema = z.object({
  firstDate: z.string().optional(),
  lastWeek: z.array(weekRecordZodSchema).default([]),
  thisWeek: z.array(weekRecordZodSchema).default([]),
});

// IGroupStudyData Zod schema
const groupStudyZodSchema = z.object({
  title: z.string(),
  category: categoryZodSchema,
  challenge: z.string().optional(),
  rules: z.array(z.string()),
  content: z.string(),
  period: z.string(),
  guide: z.string(),
  gender: z.boolean(),
  age: z.array(z.number()),
  organizer: z.any(), // IUser type should be handled appropriately
  memberCnt: memberCntZodSchema,
  password: z.string().optional(),
  status: z.enum(ENTITY.GROUPSTUDY.ENUM_STATUS),
  participants: z.array(participantsZodSchema),
  user: z.union([z.string(), z.any()]), // IUser type should be handled appropriately
  id: z.number(),
  location: z.enum(ENTITY.USER.ENUM_LOCATION),
  image: z.string().optional(),
  isFree: z.boolean(),
  feeText: z.string().optional(),
  fee: z.number().optional(),
  questionText: z.array(z.string()).optional(),
  hashTag: z.string(),
  attendance: attendanceZodSchema,
  link: z.string().optional(),
  isSecret: z.boolean().optional(),
  waiting: z.array(waitingZodSchema).optional().default([]),
  squareImage: z.string().optional(),
  meetingType: z.enum(ENTITY.GROUPSTUDY.ENUM_MEETING_TYPE).optional(),
  notionUrl: z.string().optional(),
  requiredTicket: z.number().default(1),
  totalDeposit: z.number().default(0),
  randomTicket: z.number().default(0),
});

export type GroupStudyStatus = 'end' | 'pending';
export type ICategory = z.infer<typeof categoryZodSchema>;
export type memberCntType = z.infer<typeof memberCntZodSchema>;
export type participantsType = z.infer<typeof participantsZodSchema>;
export type IWaiting = z.infer<typeof waitingZodSchema>;
export type IAttendance = z.infer<typeof attendanceZodSchema>;
export type IWeekRecord = z.infer<typeof weekRecordZodSchema>;
export type IGroupStudyData = z.infer<typeof groupStudyZodSchema> & Document;

type UserRole = (typeof ENTITY.GROUPSTUDY.ENUM_USER_ROLE)[number];

export const weekSchema: Schema<IWeekRecord> = new Schema(
  {
    uid: {
      type: String,
    },
    name: {
      type: String,
    },
    attendRecord: {
      type: [String],
    },
    attendRecordSub: {
      type: [String],
    },
  },
  { _id: false },
);

export const attendanceSchema: Schema<IAttendance> = new Schema(
  {
    firstDate: {
      type: String,
    },
    lastWeek: {
      type: [weekSchema],
    },
    thisWeek: { type: [weekSchema] },
  },
  { _id: false },
);

export const categorySchema: Schema<ICategory> = new Schema(
  {
    main: {
      type: String,
    },
    sub: {
      type: String,
    },
  },
  { _id: false },
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
  { _id: false },
);

export const participantsSchema: Schema<participantsType> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    role: {
      type: String,
      enum: ENTITY.GROUPSTUDY.ENUM_USER_ROLE,
    },
    deposit: {
      type: Number,
    },
    randomId: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["active", "rest", "warning"],
      default: "active",
    },
    monthAttendance: {
      type: Boolean,
      default: false,
    },
    lastMonthAttendance: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
    },
  },
  { _id: false },
);

export const waitingSchema: Schema<IWaiting> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    answer: {
      type: [String],
    },
    pointType: {
      type: String,
    },
    createdAt: {
      type: Date,
    },
  },
  { _id: false },
);

export const GroupStudySchema: Schema<IGroupStudyData> = new Schema(
  {
    title: {
      type: String,
    },
    isFree: {
      type: Boolean,
    },
    fee: {
      type: Number,
    },
    challenge: {
      type: String,
    },
    feeText: {
      type: String,
    },
    rules: {
      type: [String],
    },
    category: {
      type: categorySchema,
    },
    attendance: {
      type: attendanceSchema,
    },
    hashTag: {
      type: String,
    },
    content: {
      type: String,
    },
    guide: {
      type: String,
    },
    memberCnt: {
      type: memberCntSchema,
    },
    age: {
      type: [Number],
    },

    gender: {
      type: Boolean,
    },
    password: {
      type: String,
    },
    isSecret: {
      type: Boolean,
    },
    questionText: {
      type: [String],
    },
    waiting: {
      type: [waitingSchema],
      default: [],
    },
    participants: {
      type: [participantsSchema],
      ref: DB_SCHEMA.USER,
    },
    organizer: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    status: {
      type: String,
      enum: ENTITY.GROUPSTUDY.ENUM_STATUS,
      default: ENTITY.GROUPSTUDY.DEFAULT_STATUS,
      required: true,
    },
    id: {
      type: Number,
      default: 0,
    },
    period: {
      type: String,
    },
    link: {
      type: String,
    },
    location: {
      type: String,
      enum: ENTITY.USER.ENUM_LOCATION,
    },

    image: {
      type: String,
    },
    squareImage: {
      type: String,
    },
    meetingType: {
      type: String,
      enum: ENTITY.GROUPSTUDY.ENUM_MEETING_TYPE,
    },
    notionUrl: {
      type: String,
    },
    requiredTicket: {
      type: Number,
    },
    totalDeposit: {
      type: Number,
    },
    randomTicket: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export const GroupStudy =
  (mongoose.models.GroupStudy as Model<IGroupStudyData, {}, {}, {}>) ||
  model<IGroupStudyData>(DB_SCHEMA.GROUPSTUDY, GroupStudySchema);
