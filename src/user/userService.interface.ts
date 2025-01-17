import { IUser } from './entity/user.entity';

export interface IUserService {
  decodeByAES256(encodedTel: string): Promise<string>;
  createQueryString(strArr: string[]): string;
  getUserWithUid(uid: string): Promise<IUser | null>;
  getUserWithUserId(userId: string): Promise<IUser | null>;
  getUsersWithUids(uids: string[]): Promise<IUser[]>;
  getUserInfo(strArr: string[]): Promise<IUser | null>;
  getAllUserInfo(strArr: string[]): Promise<IUser[]>;
  getSimpleUserInfo(): Promise<IUser | null>;
  getAllSimpleUserInfo(): Promise<IUser[]>;
  updateUser(updateInfo: Partial<IUser>): Promise<IUser>;
  getParticipationRate(
    startDay: string,
    endDay: string,
    all?: boolean,
    location?: string | null,
    summary?: boolean,
  ): Promise<any>;
  getVoteRate(startDay: string, endDay: string): Promise<any>;
  patchProfile(): Promise<any>;
  updatePoint(point: number, message: string, sub?: string): Promise<void>;
  updatePointWithUserId(
    uid: string,
    point: number,
    message: string,
    sub?: string,
  );
  initMonthScore(): Promise<void>;
  updateScore(score: number, message: string, sub?: string): Promise<void>;
  updateUserAllScore(): Promise<void>;
  updateDeposit(deposit: number, message: string, sub?: string): Promise<void>;
  setPreference(place: any, subPlace: any[]): Promise<void>;
  getPreference(): Promise<IUser | null>;
  patchRole(role: string): Promise<void>;
  setRest(
    info: Omit<IUser['rest'], 'restCnt' | 'cumulativeSum'>,
  ): Promise<IUser>;
  deleteFriend(toUid: string): Promise<null>;
  setFriend(toUid: string): Promise<null>;
  getPromotion(): Promise<any>;
  setPromotion(name: string): Promise<void>;
  patchBelong(uid: string, belong: string): Promise<IUser>;
  getMonthScoreLog(): Promise<any>;
  getLog(type: string): Promise<any>;
  getAllLog(type: string): Promise<any>;
  test(): Promise<void>;
  patchStudyTargetHour(hour: number): Promise<void>;
  patchLocationDetail(text: string, lat: string, lon: string);
  resetGatherTicket();
  updateAddTicket(
    type: 'gather' | 'groupOnline' | 'groupOffline',
    userId: string,
  );
  updateReduceTicket(
    type: 'gather' | 'groupOnline' | 'groupOffline',
    userId: string,
  );
  getTicketInfo(userId: string);
  addBadge(badgeIdx: number);
  selectBadge(badgeIdx: number);
  updateProfileImg(img: Express.Multer.File);
}
