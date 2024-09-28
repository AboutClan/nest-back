import { Dayjs } from 'dayjs';
import mongoose, {
  model,
  Schema,
  Model,
  Document,
  InferSchemaType,
} from 'mongoose';
import { IPlace } from 'src/place/entity/place.entity';
import { IUser } from 'src/user/entity/user.entity';
import { z } from 'zod';

export interface IVoteStudyInfo {
  place?: string;
  subPlace?: string[];
  start: Dayjs;
  end: Dayjs;
  memo?: string;
}

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
  start: z.instanceof(Date).optional(), // Or use dayjs instance check if needed
  end: z.instanceof(Date).optional(),
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

export interface ITimeStartToEndHM {
  start?: {
    hour?: number;
    minutes?: number;
  };
  end?: {
    hour?: number;
    minutes?: number;
  };
}

export interface IPlaceStatus {
  status?: 'pending' | 'waiting_confirm' | 'open' | 'dismissed' | 'free';
}

export interface IParticipation extends IPlaceStatus, ITimeStartToEndHM {
  place?: IPlace;
  attendences?: IAttendance[];
  absences?: IAbsence[];
  startTime?: Date;
  endTime?: Date;
}

export interface ITimeStartToEnd {
  start?: Dayjs;
  end?: Dayjs;
}

export interface IVote extends Document {
  date: Date;
  participations: IParticipation[];
}

export interface IAttendance {
  user: string | IUser;
  time: ITimeStartToEnd;
  created: Date;
  arrived?: Date;
  firstChoice: boolean;
  confirmed: boolean;
  memo?: string;
  imageUrl: string;
}

export interface IAbsence {
  user: string | IUser;
  noShow: boolean;
  message: string;
}

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
      ref: 'User',
    },
    time: ParticipantTimeSchema,

    arrived: Date,

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
      ref: 'User',
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
      ref: 'Place',
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
