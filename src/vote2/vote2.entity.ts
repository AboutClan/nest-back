import mongoose, { model, Model, Schema } from 'mongoose';

export interface IVote2 {
  date: Date;
  participations: IParticipation[];
  results: any[];
}

export interface IParticipation {
  userId: String;
  latitude: String;
  longitude: String;
  start?: String;
  end?: String;
}

interface IResult {
  placeId: String;
  members: String[];
}

export const ParticipationSchema: Schema<IParticipation> = new Schema({
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
});

export const ResultSchema: Schema<IResult> = new Schema({
  placeId: {
    type: Schema.Types.ObjectId,
    ref: 'Place',
  },
  members: [String],
});

export const Vote2Schema: Schema<IVote2> = new Schema({
  date: Date,
  participations: ParticipationSchema,
  results: ResultSchema,
});

export const Vote2 =
  (mongoose.models.Vote2 as Model<IVote2, {}, {}, {}>) ||
  model<IVote2>('Vote2', Vote2Schema);
