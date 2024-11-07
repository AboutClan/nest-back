import mongoose, { model, Schema, Model, Document } from 'mongoose';
import { z } from 'zod';

export const DeviceSchema = z.object({
  platform: z.string(),
  token: z.string(),
});
export const FcmTokenZodSchema = z.object({
  uid: z.string(),
  devices: z.array(DeviceSchema),
});

export interface IFcmToken extends Document {
  uid: string;
  devices: IDevice[];
}

export interface IDevice {
  platform: string;
  token: string;
}

const deviceSchema: Schema<IDevice> = new Schema({
  platform: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
});

export const FcmTokenSchema: Schema<IFcmToken> = new Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
  },
  devices: [deviceSchema],
});

export const FcmToken =
  (mongoose.models.FcmToken as Model<IFcmToken, {}, {}, {}>) ||
  model<IFcmToken>('FcmToken', FcmTokenSchema);
