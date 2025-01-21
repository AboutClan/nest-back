import mongoose, { Model, Schema } from 'mongoose';
import { z } from 'zod';

export const PaymentZodSchema = z.object({});

export type IPayment = z.infer<typeof PaymentZodSchema>;

export const paymentSchema: Schema<IPayment> = new Schema({});

export const Payment =
  (mongoose.models.Payment as Model<IPayment, {}, {}, {}>) ||
  mongoose.model<IPayment>('Payment', paymentSchema);
