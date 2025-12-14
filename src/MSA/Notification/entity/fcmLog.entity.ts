import { model, Schema } from 'mongoose';
import { z } from 'zod';

export const FailedZodSchema = z.object({
  uid: z.string(),
  error: z.string(),
});

export const FcmLogZodSchema = z.object({
  title: z.string(),
  description: z.string(),
  successUids: z.array(z.string()),
  failed: z.array(FailedZodSchema),
});

export type IFcmLog = z.infer<typeof FcmLogZodSchema>;
export type IFailed = z.infer<typeof FailedZodSchema>;

const failedSchema: Schema<IFailed> = new Schema({
  uid: {
    type: String,
    required: true,
  },
  error: {
    type: String,
    required: true,
  },
});

export const FcmLogSchema: Schema<IFcmLog> = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    successUids: {
      type: [String],
      required: true,
    },
    failed: {
      type: [failedSchema],
      required: true,
    },
  },
  { timestamps: true },
);

export const FcmLog = model<IFcmLog>('FcmLog', FcmLogSchema);
