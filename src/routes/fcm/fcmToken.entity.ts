import mongoose, { model, Schema, Model, Document } from 'mongoose';
import { z } from 'zod';

export const DeviceSchema = z.object({
  platform: z.string(),
  token: z.string(),
});
export const FcmTokenZodSchema = z.object({
  uid: z.string(),
  userId: z.string(),
  devices: z.array(DeviceSchema),
});

export type IDevice = z.infer<typeof DeviceSchema>;
export type IFcmToken = z.infer<typeof FcmTokenZodSchema> & Document;

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
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  devices: [deviceSchema],
});

export const FcmToken =
  (mongoose.models.FcmToken as Model<IFcmToken, {}, {}, {}>) ||
  model<IFcmToken>('FcmToken', FcmTokenSchema);
