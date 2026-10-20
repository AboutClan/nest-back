import mongoose, { Document, model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

export interface ILogTemperature extends Document {
    from: string;
    to: string;
    sub: string;
    timestamp: Date;
    source?: string;
    groupId?: string;
    period?: string;
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
        // 소모임 월간 멤버 평가로 남긴 기록만 채워진다 (source: 'groupMonthly', period: 'YYYY-MM')
        source: { type: String },
        groupId: { type: String },
        period: { type: String },
    },
    { timestamps: true },
);

LogTemperatureSchema.index({ source: 1, groupId: 1, period: 1, from: 1 });

export const LogTemperature =
    (mongoose.models.LogTemperature as Model<ILogTemperature, {}, {}, {}>) ||
    model<ILogTemperature>(DB_SCHEMA.LOG_TEMPERATURE, LogTemperatureSchema);
