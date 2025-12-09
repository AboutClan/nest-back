import mongoose, { model, Schema, Document, Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { IUser } from 'src/MSA/User/entity/user.entity';

export interface IAccount extends Document {
  provider: string;
  type: string;
  providerAccountId: string;
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
  refresh_token_expires_in: number;
  userId: IUser | string;
}

export const AccountSchema: Schema<IAccount> = new Schema({
  provider: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  providerAccountId: {
    type: String,
    required: true,
  },
  access_token: {
    type: String,
    required: true,
  },
  token_type: {
    type: String,
    required: true,
  },
  refresh_token: {
    type: String,
    required: true,
  },
  expires_at: {
    type: Number,
    required: true,
  },
  scope: String,
  refresh_token_expires_in: Number,
  userId: {
    type: Schema.Types.ObjectId,
    ref: DB_SCHEMA.USER,
  },
});

export const Account =
  (mongoose.models.Account as Model<IAccount, {}, {}, {}>) ||
  model<IAccount>(DB_SCHEMA.ACCOUNT, AccountSchema);
