import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { IGatherRequest } from 'src/domain/entities/GatherRequest/GatherRequest';

export const GatherRequestSchema: Schema<IGatherRequest> = new Schema({
  writer: { type: Schema.Types.ObjectId, ref: DB_SCHEMA.USER },
  title: { type: String, required: true },
  content: { type: String, required: true },
  like: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  prize: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
  },
});

export const GatherRequestModel =
  (mongoose.models.GatherRequest as Model<IGatherRequest, {}, {}, {}>) ||
  model<IGatherRequest>(DB_SCHEMA.GATHERREQUEST, GatherRequestSchema);
