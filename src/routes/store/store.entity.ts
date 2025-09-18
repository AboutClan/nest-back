import mongoose, { Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { z } from 'zod';
import { IUser } from '../user/user.entity';

export const ApplicantZodSchema = z.object({
  user: z.union([z.string(), z.custom<IUser>()]),
  cnt: z.number(),
});

export const StoreZodSchema = z.object({
  name: z.string(),
  image: z.string(),
  point: z.number(),
  winnerCnt: z.number(),
  status: z.string(),
  applicants: z.array(ApplicantZodSchema),
  max: z.number(),
  winner: z.array(z.string()),
});

export type IStore = z.infer<typeof StoreZodSchema>;
export type IApplicant = z.infer<typeof ApplicantZodSchema>;

export const applicantSchema: Schema<IApplicant> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    cnt: Number,
  },
  { timestamps: true },
);

export const storeSchema: Schema<IStore> = new Schema(
  {
    name: String,
    image: String,
    point: Number,
    winnerCnt: Number,
    status: String,
    applicants: [applicantSchema],
    max: Number,
    winner: [
      {
        type: Schema.Types.ObjectId,
        ref: DB_SCHEMA.USER,
      },
    ],
  },
  { timestamps: true },
);

export const Store =
  (mongoose.models.Store as Model<IStore, {}, {}, {}>) ||
  mongoose.model<IStore>(DB_SCHEMA.STORE, storeSchema);
