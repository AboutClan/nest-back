import mongoose, { model, Schema, Document, Model } from 'mongoose';
import { z } from 'zod';

// KeyType Zod schema
const keyZodSchema = z.object({
  p256dh: z.string(),
  auth: z.string(),
});

// NotificationSub Zod schema
const notificationSubZodSchema = z.object({
  endpoint: z.string(),
  keys: keyZodSchema,
  uid: z.string(),
});

export type KeyType = z.infer<typeof keyZodSchema>;
export type INotificationSub = z.infer<typeof notificationSubZodSchema>;

const KeySchema: Schema<KeyType> = new Schema({
  p256dh: {
    type: String,
  },
  auth: { type: String },
});

export const NotificationSubSchema: Schema<INotificationSub> = new Schema({
  endpoint: {
    type: String,
  },
  keys: KeySchema,
  uid: {
    type: String,
  },
});

export const NotificationSub: Model<INotificationSub> =
  mongoose.models.NotificationSub ||
  model<INotificationSub>('NotificationSub', NotificationSubSchema);
