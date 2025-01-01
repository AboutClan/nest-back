import mongoose, { model, Model, Schema } from 'mongoose';

export interface IVote2 {
  date: Date;
  participations: IParticipation[];
  results: any[];
}

export interface IParticipation {
  userId: string | String;
  latitude: string;
  longitude: string;
  start?: string;
  end?: string;
}

export interface IMember {
  userId: string | String;
  arrived?: Date;
  memo?: string;
  img?: string;
}

export interface IResult {
  placeId: string | String;
  members: IMember[];
}

export const MemberSchema: Schema<IMember> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    arrived: Date,
    memo: String,
    img: String,
  },
  { _id: false },
);

export const ParticipationSchema: Schema<IParticipation> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
  },
  { _id: false },
);

export const ResultSchema: Schema<IResult> = new Schema(
  {
    placeId: {
      type: Schema.Types.ObjectId,
      ref: 'Place',
    },
    members: [MemberSchema],
  },
  { _id: false },
);

export const Vote2Schema: Schema<IVote2> = new Schema({
  date: Date,
  participations: {
    type: [ParticipationSchema],
    default: [],
  },
  results: [ResultSchema],
});

export const Vote2 =
  (mongoose.models.Vote2 as Model<IVote2, {}, {}, {}>) ||
  model<IVote2>('Vote2', Vote2Schema);
