import { Dayjs } from 'dayjs';
import mongoose, { model, Schema, Model, Document } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { z } from 'zod';

const TimeStartToEndHMZodSchema = z.object({
  start: z
    .object({
      hour: z.number().optional(),
      minutes: z.number().optional(),
    })
    .optional(),
  end: z
    .object({
      hour: z.number().optional(),
      minutes: z.number().optional(),
    })
    .optional(),
});

// PlaceStatus schema
const PlaceStatusZodSchema = z.object({
  status: z
    .enum(['pending', 'waiting_confirm', 'open', 'dismissed', 'free'])
    .optional(),
});

// TimeStartToEnd schema
const TimeStartToEndZodSchema = z.object({
  start: z.date().optional(), // Or use dayjs instance check if needed
  end: z.date().optional(),
});

// Attendance schema
const AttendanceZodSchema = z.object({
  user: z.union([z.string(), z.any()]), // IUser type should be properly replaced if defined
  time: TimeStartToEndZodSchema,
  created: z.instanceof(Date),
  arrived: z.instanceof(Date).optional(),
  firstChoice: z.boolean(),
  confirmed: z.boolean(),
  memo: z.string().optional(),
  imageUrl: z.string(),
  comment: z.object({
    text: z.string(),
  }),
});

// Absence schema
const AbsenceZodSchema = z.object({
  user: z.union([z.string(), z.any()]), // IUser type should be properly replaced if defined
  noShow: z.boolean(),
  message: z.string(),
});

// Participation schema
const ParticipationZodSchema = z
  .object({
    place: z.any().optional(), // IPlace type should be properly replaced if defined
    attendences: z.array(AttendanceZodSchema).optional(),
    absences: z.array(AbsenceZodSchema).optional(),
    startTime: z.instanceof(Date).optional(),
    endTime: z.instanceof(Date).optional(),
    status: z
      .enum(['pending', 'waiting_confirm', 'open', 'dismissed', 'free'])
      .optional(),
  })
  .merge(TimeStartToEndHMZodSchema);

// Vote schema
const VoteZodSchema = z.object({
  date: z.instanceof(Date),
  participations: z.array(ParticipationZodSchema),
});

export interface IVoteStudyInfo {
  place?: string;
  subPlace?: string[];
  start: string;
  end: string;
  memo?: string;
}
export type ITimeStartToEndHM = z.infer<typeof TimeStartToEndHMZodSchema>;
export type IPlaceStatus = z.infer<typeof PlaceStatusZodSchema>;
export type ITimeStartToEnd = z.infer<typeof TimeStartToEndZodSchema>;
export type IAttendance = z.infer<typeof AttendanceZodSchema>;
export interface IComment {
  text: string;
}
export type IAbsence = z.infer<typeof AbsenceZodSchema>;
export type IParticipation = z.infer<typeof ParticipationZodSchema>;
export type IVote = z.infer<typeof VoteZodSchema> & Document;

const CommentSchema: Schema<IComment> = new Schema(
  {
    text: {
      type: String,
      required: false,
    },
  },
  { _id: false, timestamps: true },
);

const ParticipantTimeSchema: Schema<ITimeStartToEnd> = new Schema(
  {
    start: {
      type: Date,
      required: false,
    },
    end: {
      type: Date,
      required: false,
    },
  },
  { _id: false },
);

const AttendanceSchema: Schema<IAttendance> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    time: ParticipantTimeSchema,

    arrived: Date,

    comment: CommentSchema,

    firstChoice: {
      type: Schema.Types.Boolean,
      default: true,
    },
    memo: String,
    imageUrl: String,
  },
  { _id: false, timestamps: true, strict: false },
);

const AbsenceSchema: Schema<IAbsence> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    noShow: {
      type: Schema.Types.Boolean,
      default: false,
    },
    message: Schema.Types.String,
  },
  { _id: false, timestamps: true },
);

const ParticipationSchema: Schema<IParticipation> = new Schema(
  {
    place: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.PLACE,
    },

    attendences: [AttendanceSchema],
    absences: [AbsenceSchema],
    startTime: Date,
    endTime: Date,
    status: {
      type: Schema.Types.String,
      enum: ['pending', 'waiting_confirm', 'open', 'dismissed', 'free'],
      default: 'pending',
    },
  },
  { _id: false, strict: false },
);

export const VoteSchema: Schema<IVote> = new Schema({
  date: Date,
  participations: [ParticipationSchema],
});

export const Vote =
  (mongoose.models.Vote as Model<IVote, {}, {}, {}>) ||
  model<IVote>('Vote', VoteSchema);
