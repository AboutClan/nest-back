import { InjectModel } from "@nestjs/mongoose";
import { ILogTemperatureRepository } from "../core/interfaces/LogTemperature.interface";
import { Model } from "mongoose";
import { DB_SCHEMA } from "src/Constants/DB_SCHEMA";
import { ILogTemperature } from "../entity/logTemperature.entity";

export class LogTemperatureRepository implements ILogTemperatureRepository {
    constructor(
        @InjectModel(DB_SCHEMA.LOG_TEMPERATURE) private readonly LogTemperature: Model<ILogTemperature>,
    ) { }

    async create(logTemperature: ILogTemperature) {
        return await this.LogTemperature.create(logTemperature);
    }

    async findTemperature(uid: string) {
        return await this.LogTemperature.find(
            { to: uid, type: 'temperature' },
            '-_id -__v',
        );
    }
    async findTemperatureByUidArr(uidArr: string[]) {
        return await this.LogTemperature.find(
            {
                type: 'temperature',
                to: { $in: uidArr },
                from: { $in: uidArr },
            },
            '-_id -__v',
        ).sort({ timestamp: 1 });
    }

    async findTemperatureByPeriod(start: Date, end: Date) {
        return await this.LogTemperature.find(
            { timestamp: { $gt: start, $lte: end } },
            '-_id -__v',
        );
    }

    async findAllTemperature(page: number = 1, uid: string) {
        const offset = 20;

        return await this.LogTemperature.find(
            {
                toUid: uid,
                type: 'temperature',
                message: { $exists: true },
            },
            '-_id -__v',
        )
            .sort({ timestamp: -1 })
            .skip(offset * (page - 1))
            .limit(offset);
    }

    async findMyTemperature(toUid: string) {
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        cutoffDate.setDate(16);
        cutoffDate.setHours(0, 0, 0, 0); // 15일 00:00:00 포함
        const baseMatch = {
            to: toUid,
            type: 'temperature' as const,
            timestamp: { $lte: cutoffDate }, // 지난 달 15일 포함 이전
        };

        const latestByFrom = await this.LogTemperature.aggregate([
            { $match: baseMatch },
            { $sort: { timestamp: -1 } },
        ]);

        const totalCnt = latestByFrom.length;

        let greatCnt = 0;
        let goodCnt = 0;

        // 2) great / good 카운트 & 리뷰용 데이터 필터링
        const reviewCandidates = latestByFrom.filter((notice) => {
            if (notice.sub === 'great') greatCnt += 1;
            if (notice.sub === 'good') goodCnt += 1;
            return (
                (notice.sub === 'great' || notice.sub === 'good') &&
                notice.message &&
                notice.message.trim() !== ''
            );
        });

        // 3) 리뷰는 createdAt 기준으로 최신 3개만, _id / __v 제거
        const reviewArr = reviewCandidates
            .sort(
                (a, b) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
            )
            .slice(0, 3)
            .map(({ _id, __v, ...rest }) => rest); // 필요하면 여기서 명시적으로 필드 선택

        return { reviewArr, totalCnt, greatCnt, goodCnt };
    }
}