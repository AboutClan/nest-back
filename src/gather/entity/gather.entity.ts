import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { IUser } from 'src/user/entity/user.entity';
import { z } from 'zod';

export type gatherStatus = 'pending' | 'open' | 'close' | 'end';

export const TimeZodSchema = z.object({
  hours: z.number().nullable(),
  minutes: z.number().nullable(),
});
export const WaitingZodSchema = z.object({
  user: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  phase: z.string(),
});
export const TitleZodSchema = z.object({
  title: z.string(),
  subtitle: z.string().nullable().optional(),
});
export const LocationZodSchema = z.object({
  main: z.string(),
  sub: z.string().nullable(),
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
  user: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  phase: z.string(),
});

export const SubCommentZodSchema = z.object({
  user: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  comment: z.string(),
  likeList: z.array(z.string()).nullable().optional(),
});

export const CommentZodSchema = z.object({
  user: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  comment: z.string(),
  subComments: z.array(SubCommentZodSchema).optional(),
  likeList: z.array(z.string()).nullable(),
});

export const GatherZodSchema = z.object({
  title: z.string(),
  type: TitleZodSchema,
  gatherList: z.array(GathersZodSchema),
  content: z.string(),
  location: LocationZodSchema,
  memberCnt: MemberCntZodSchema,
  age: z.array(z.number()).nullable(),
  preCnt: z.number().nullable(),
  genderCondition: z.boolean(),
  password: z.string().nullable(),
  status: z.enum(['pending', 'open', 'close', 'end']).default('pending'),
  participants: z.array(ParticipantsZodSchema),
  user: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  comments: z.array(CommentZodSchema),
  id: z.number(),
  date: z.string(),
  place: z.string().nullable(),
  isAdminOpen: z.boolean().nullable(),
  image: z.string().nullable(),
  kakaoUrl: z.string().nullable(),
  waiting: z.array(WaitingZodSchema),
  isApprovalRequired: z.boolean().nullable(),
});

export interface ITime {
  hours?: number;
  minutes?: number;
}

interface IWaiting {
  user: string | IUser;
  phase: string;
}

export interface TitleType {
  title: string;
  subtitle?: string;
}
export interface LocationType {
  main: string;
  sub?: string;
}

export interface memberCntType {
  min: number;
  max: number;
}

export interface GatherType {
  text: string;
  time: ITime;
}

export interface participantsType {
  user: string | IUser;
  phase: string;
}

export interface subCommentType {
  user: string | IUser;
  comment: string;
  likeList?: string[];
}

export interface commentType {
  user: string | IUser;
  comment: string;
  subComments?: subCommentType[];
  likeList?: string[];
}

export interface IGatherData extends Document {
  title: string;
  type: TitleType;
  gatherList: GatherType[];
  content: string;
  location: LocationType;
  memberCnt: memberCntType;
  age?: number[];
  preCnt?: number;
  genderCondition: boolean;
  password?: string;
  status: gatherStatus;
  participants: participantsType[];
  user: string | IUser;
  comments: commentType[];
  id: number;
  date: string;
  place?: string;
  isAdminOpen?: boolean;
  image?: string;
  kakaoUrl?: string;
  waiting: IWaiting[];
  isApprovalRequired?: boolean;
}

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
      ref: 'User',
    },
    phase: {
      type: String,
      enum: ['all', 'first', 'second'],
    },
  },
  { _id: false, timestamps: false },
);

export const waitingSchema: Schema<IWaiting> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    phase: {
      type: String,
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
      ref: 'User',
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['pending', 'open', 'close', 'end'],
      default: 'pending',
      required: true,
    },
    comments: {
      type: [commentSchema],
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
      ref: 'User',
      default: [],
    },
    place: {
      type: String,
      enum: [
        '수원',
        '양천',
        '안양',
        '강남',
        '동대문',
        '전체',
        '수원/안양',
        '양천/강남',
        '인천',
      ],
    },
    isAdminOpen: {
      type: Boolean,
    },
    image: {
      type: String,
    },
    kakaoUrl: {
      type: String,
    },
    isApprovalRequired: {
      type: Boolean,
    },
  },
  { timestamps: true, strict: false },
);

export const Gather =
  (mongoose.models.Gather as Model<IGatherData, {}, {}, {}>) ||
  model<IGatherData>('Gather', GatherSchema);
