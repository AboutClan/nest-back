import { ILogTemperature } from "../../entity/logTemperature.entity";

export interface ILogTemperatureRepository {
    create(logTemperature: ILogTemperature);
    findMyTemperature(toUid: string);
    findAllTemperature(page: number, uid: string);
    findTemperature(uid: string);
    findTemperatureByUidArr(uidArr: string[]);
    findTemperatureByPeriod(start: Date, end: Date);
}