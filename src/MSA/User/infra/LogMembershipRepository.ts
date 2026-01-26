import { DB_SCHEMA } from "src/Constants/DB_SCHEMA";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ILogMembership } from "../entity/logMembership.entity";
import { ILogMembershipRepository } from "../core/interfaces/LogMembership.interface";

export class LogMembershipRepository implements ILogMembershipRepository {
    constructor(
        @InjectModel(DB_SCHEMA.LOG_MEMBERSHIP) private readonly LogMembershipModel: Model<ILogMembership>,
    ) {}

    findByUserId(userId: string) {
        return this.LogMembershipModel.find({ userId }).sort({ timestamp: -1 }).lean();
    }

    create(logMembership: ILogMembership) {
        return this.LogMembershipModel.create(logMembership);
    }
}