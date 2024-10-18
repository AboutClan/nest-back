import { IUser } from './entity/user.entity';

export interface UserRepository {
  findByUid(uid: string): Promise<IUser>;
  findByUids(uids: string[]): Promise<IUser[]>;
  findByUidWithQ(uid: string, queryString: string): Promise<IUser>;
  findAllWithQ(queryString: string): Promise<IUser[]>;
  updateUser(uid: string, updateInfo): Promise<null>;
  findByLocation(location: string): Promise<IUser[]>;
  findByUidIsActive(
    isActive: boolean,
    uid: string,
    all: boolean,
  ): Promise<IUser[]>;
  findByIsActive(isActive: boolean): Promise<IUser[]>;
  increasePoint(point: number, uid: string): Promise<null>;
  increaseScore(score: number, uid: string): Promise<null>;
  increaseDeposit(deposit: number, uid: string): Promise<null>;
  findAll(): Promise<IUser[]>;
  updatePreference(uid: string, place: any, subPlace: any[]): Promise<null>;
  deleteFriend(uid: string, toUid: string): Promise<null>;
  updateFriend(uid: string, toUid: string): Promise<null>;
  updateBelong(uid: string, belong: string): Promise<null>;
}
