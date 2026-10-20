import { ILogTemperature } from "../../entity/logTemperature.entity";

export interface ILogTemperatureRepository {
    create(logTemperature: ILogTemperature);
    findMyTemperature(toUid: string);
    findAllTemperature(page: number, uid: string);
    findTemperature(uid: string);
    findTemperatureByUidArr(uidArr: string[]);
    findTemperatureByPeriod(start: Date, end: Date);
    findGivenSince(fromUid: string, toUids: string[], start: Date);
    findGroupMonthlySubmitters(groupId: string, period: string): Promise<string[]>;
    overwriteLatestGivenOrCreate(
        start: Date,
        log: Pick<ILogTemperature, 'from' | 'to' | 'sub' | 'timestamp' | 'source' | 'groupId' | 'period'>,
    );
}