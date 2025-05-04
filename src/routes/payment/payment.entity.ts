import mongoose, { Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { z } from 'zod';

export const PaymentZodSchema = z.object({
  paymentId: z.string(),
  amount: z.number(),
});

export type IPayment = z.infer<typeof PaymentZodSchema>;

export const paymentSchema: Schema<IPayment> = new Schema({
  paymentId: String,
  amount: Number,
});

export const Payment =
  (mongoose.models.Payment as Model<IPayment, {}, {}, {}>) ||
  mongoose.model<IPayment>(DB_SCHEMA.PAYMENT, paymentSchema);
