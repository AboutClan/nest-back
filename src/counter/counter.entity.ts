import mongoose, { model, Schema, Model } from 'mongoose';

export interface ICounter {
  seq: number;
  key: string;
  location?: string;
}

export const CounterSchema: Schema<ICounter> = new Schema({
  seq: {
    type: Number,
  },
  key: {
    type: String,
  },
  location: {
    type: String,
  },
});

export const Counter =
  (mongoose.models.Counter as Model<ICounter, {}, {}, {}>) ||
  model<ICounter>('Counter', CounterSchema);
