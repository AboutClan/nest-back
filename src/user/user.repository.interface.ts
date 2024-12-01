import { IUser } from './entity/user.entity';

export interface UserRepository {
  findById(userId: string): Promise<IUser>;
  findByUid(uid: string, queryString?: string): Promise<IUser>;
  findByUserId(userId: string): Promise<IUser>;
  findByUids(uids: string[]): Promise<IUser[]>;
  findAll(queryString?: string): Promise<IUser[]>;
  updateUser(uid: string, updateInfo): Promise<null>;
  updateUserById(id: string, updateInfo: any): Promise<null>;
  initMonthScore(): Promise<null>;
  findByLocation(location: string): Promise<IUser[]>;
  findByIsActive(isActive: boolean, queryString?: string): Promise<IUser[]>;
  findByIsActiveUid(
    uid: string,
    isActive: boolean,
    queryString?: string,
  ): Promise<IUser[]>;
  increasePoint(point: number, uid: string): Promise<null>;
  increasePointWithUserId(point: number, userId: string): Promise<null>;
  increaseScore(score: number, uid: string): Promise<null>;
  increaseDeposit(deposit: number, uid: string): Promise<null>;
  updatePreference(uid: string, place: any, subPlace: any[]): Promise<null>;
  setRest(info: any, uid: string, dayDiff: any): Promise<IUser>;
  deleteFriend(uid: string, toUid: string): Promise<null>;
  updateFriend(uid: string, toUid: string): Promise<null>;
  updateBelong(uid: string, belong: string): Promise<null>;
  patchLocationDetail(uid: string, text: string, lat: string, lon: string);
}
