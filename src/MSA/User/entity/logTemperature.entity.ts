import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

export interface ILogTemperature extends Document {
    from: string;
    to: string;
    sub: string;
    timestamp: Date;
}

export const LogTemperatureSchema: Schema<ILogTemperature> = new Schema(
    {
        from: {
            type: String,
            required: true,
        },
        to: {
            type: String,
            required: true,
        },
        sub: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true },
);

export const LogTemperature =
    (mongoose.models.LogTemperature as Model<ILogTemperature, {}, {}, {}>) ||
    model<ILogTemperature>(DB_SCHEMA.LOG_TEMPERATURE, LogTemperatureSchema);
