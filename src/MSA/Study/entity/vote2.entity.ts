import mongoose, { model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { IPlace } from 'src/MSA/Place/place/place.entity';
import { IUser } from '../../User/entity/user.entity';

export interface IVote2 {
  date: string;
  participations: IParticipation[];
  results: any[];
}

export interface IParticipation {
  userId: string | IUser;
  latitude: number;
  longitude: number;
  start?: string;
  end?: string;
  comment?: IVoteComment;
  locationDetail: string;
  isBeforeResult?: boolean;
  eps?: number;
}

export interface IMember {
  userId: string | IUser;
  arrived?: Date;
  memo?: string;
  img?: string;
  start?: string;
  end?: string;
  absence?: boolean;
  comment?: {
    text: string;
  };
  imageUrl?: string;
}

export interface IResult {
  placeId: string | String | IPlace;
  members: IMember[];
  center: any;
  reviewers?: string[];
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
    imageUrl: String,
  },
  { _id: false },
);

export const ParticipationSchema: Schema<IParticipation> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    latitude: Number,
    longitude: Number,
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
    eps: {
      type: Number,
      default: 3,
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
    reviewers: [String],
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
