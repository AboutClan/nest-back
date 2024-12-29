import mongoose, { model, Model, Schema } from 'mongoose';

interface IVote2 {
  date: Date;
  participations: IParticipation[];
  results: any[];
}

interface IParticipation{
    userId: String;
    latitude: String;
    longitude: String;
}

interface IResult{
    placeId: String;
    members: String[];
}

export const ParticipationSchema: Schema<IParticipation> = new Schema({
    userId: String;
    latitude: String;
    longitude: String;
})

export const ResultSchema: Schema<IResult> = new Schema({
    placeId: String;
    members: [String];
})

export const Vote2Schema: Schema<IVote2> = new Schema({
  date: Date,
  participations: ParticipationSchema,
  results: ResultSchema,
});

export const Vote2 =
  (mongoose.models.Vote2 as Model<IVote2, {}, {}, {}>) ||
  model<IVote2>('Vote', Vote2Schema);
