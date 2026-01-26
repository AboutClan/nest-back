import mongoose, { model, Schema, Document, Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

export interface ILogMembership extends Document {
  userId: string;
  type: 'create' | 'decay';
  timestamp: Date;
}

export const LogMembershipSchema: Schema<ILogMembership> = new Schema({
  userId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true, _id: false });

export const LogMembership =
  (mongoose.models.LogMembership as Model<ILogMembership, {}, {}, {}>) ||
  model<ILogMembership>(DB_SCHEMA.LOG_MEMBERSHIP, LogMembershipSchema);
