import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { LOCATION_LIST } from 'src/Constants/constants';
import { IUser } from 'src/user/entity/user.entity';
import { z } from 'zod';

// UserRole enum
const userRoleZodSchema = z.enum(['admin', 'manager', 'member', 'outsider']);

// ICategory Zod schema
const categoryZodSchema = z.object({
  main: z.string(),
  sub: z.string(),
});

// subCommentType Zod schema
const subCommentZodSchema = z.object({
  user: z.union([z.string(), z.custom<IUser>()]),
  comment: z.string(),
  likeList: z.array(z.string()).optional().default([]),
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
  attendCnt: z.number(),
  weekAttendance: z.boolean().default(false),
});
// IWaiting Zod schema
const waitingZodSchema = z.object({
  user: z.union([z.string(), z.custom<IUser>()]), // IUser type should be handled appropriately
  answer: z.string().optional(),
  pointType: z.string(),
});

// commentType Zod schema
const commentZodSchema = z.object({
  user: z.union([z.string(), z.any()]), // IUser type should be handled appropriately
  comment: z.string(),
  subComments: z.array(subCommentZodSchema).optional().default([]),
  likeList: z.array(z.string()).optional().default([]),
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
  status: z.enum(['end', 'pending', 'planned']),
  participants: z.array(participantsZodSchema),
  user: z.union([z.string(), z.any()]), // IUser type should be handled appropriately
  comments: z.array(commentZodSchema).optional(),
  id: z.number(),
  location: z.enum(LOCATION_LIST),
  image: z.string().optional(),
  isFree: z.boolean(),
  feeText: z.string().optional(),
  fee: z.number().optional(),
  questionText: z.string().optional(),
  hashTag: z.string(),
  attendance: attendanceZodSchema,
  link: z.string().optional(),
  isSecret: z.boolean().optional(),
  waiting: z.array(waitingZodSchema).optional().default([]),
  squareImage: z.string().optional(),
  meetingType: z.enum(['online', 'offline', 'hybrid']).optional(),
});

export type GroupStudyStatus = 'end' | 'pending';
export type ICategory = z.infer<typeof categoryZodSchema>;
export type subCommentType = z.infer<typeof subCommentZodSchema>;
export type memberCntType = z.infer<typeof memberCntZodSchema>;
export type participantsType = z.infer<typeof participantsZodSchema>;
export type IWaiting = z.infer<typeof waitingZodSchema>;
export type commentType = z.infer<typeof commentZodSchema>;
export type IAttendance = z.infer<typeof attendanceZodSchema>;
export type IWeekRecord = z.infer<typeof weekRecordZodSchema>;
export type IGroupStudyData = z.infer<typeof groupStudyZodSchema> & Document;

type UserRole = 'admin' | 'manager' | 'member' | 'outsider';

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
      ref: 'User',
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'manager', 'human', 'outsider'],
    },
    attendCnt: {
      type: Number,
    },
    randomId: {
      type: Number,
    },
    weekAttendance: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

export const subCommentSchema: Schema<subCommentType> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    comment: {
      type: String,
    },
    likeList: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const commentSchema: Schema<commentType> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    comment: {
      type: String,
    },
    subComments: {
      type: [subCommentSchema],
      default: [],
    },
    likeList: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const waitingSchema: Schema<IWaiting> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    answer: {
      type: String,
    },
    pointType: {
      type: String,
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
      type: String,
    },
    waiting: {
      type: [waitingSchema],
      ref: 'User',
      default: [],
    },
    participants: {
      type: [participantsSchema],
      ref: 'User',
    },
    organizer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['pending', 'open', 'close', 'end', 'gathering', 'study'],
      default: 'pending',
      required: true,
    },
    id: {
      type: Number,
      default: 0,
    },
    period: {
      type: String,
    },
    comments: {
      type: [commentSchema],
    },
    link: {
      type: String,
    },
    location: {
      type: String,
      enum: LOCATION_LIST,
    },

    image: {
      type: String,
    },
    squareImage: {
      type: String,
    },
    meetingType: {
      type: String,
      enum: ['online', 'offline', 'hybrid'],
    },
  },
  { timestamps: true },
);

export const GroupStudy =
  (mongoose.models.GroupStudy as Model<IGroupStudyData, {}, {}, {}>) ||
  model<IGroupStudyData>('GroupStudy', GroupStudySchema);
