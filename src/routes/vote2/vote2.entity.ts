import mongoose, { model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { IPlace } from 'src/routes/place/place.entity';

export interface IVote2 {
  date: string;
  participations: IParticipation[];
  results: any[];
}

export interface IParticipation {
  userId: string | String;
  latitude: string;
  longitude: string;
  start?: string;
  end?: string;
  comment?: IVoteComment;
  locationDetail: string;
  isBeforeResult?: boolean;
}

export interface IMember {
  userId: string | String;
  arrived?: Date;
  memo?: string;
  img?: string;
  start?: string;
  end?: string;
  absence?: boolean;
  comment?: {
    text: string;
  };
}

export interface IResult {
  placeId: string | String | IPlace;
  members: IMember[];
  center: any;
}

export interface IVoteComment {
  comment: string;
}

export const voteCommentSchema: Schema<IVoteComment> = new Schema(
  {
    comment: String,
  },
  {
    timestamps: true,
  },
);

export const MemberSchema: Schema<IMember> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    start: String,
    end: String,
    arrived: Date,
    absence: {
      type: Boolean,
      default: false,
    },
    memo: String,
    img: String,
    comment: voteCommentSchema,
  },
  { _id: false },
);

export const ParticipationSchema: Schema<IParticipation> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    latitude: String,
    longitude: String,
    start: {
      type: String,
      required: false,
    },
    end: {
      type: String,
      required: false,
    },
    comment: {
      type: voteCommentSchema,
    },
    locationDetail: String,
    isBeforeResult: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

export const ResultSchema: Schema<IResult> = new Schema(
  {
    placeId: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.PLACE,
    },
    members: [MemberSchema],
  },
  { _id: false },
);

export const Vote2Schema: Schema<IVote2> = new Schema({
  date: String,
  participations: {
    type: [ParticipationSchema],
    default: [],
  },
  results: [ResultSchema],
});

export const Vote2 =
  (mongoose.models.Vote2 as Model<IVote2, {}, {}, {}>) ||
  model<IVote2>(DB_SCHEMA.VOTE, Vote2Schema);
