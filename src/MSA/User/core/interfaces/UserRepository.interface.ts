import { User } from 'src/MSA/User/core/domain/User/User';

export interface IUserRepository {
  findById(userId: string): Promise<User>;
  findByUid(uid: string, queryString?: string): Promise<User | null>;
  findByUserId(userId: string): Promise<User | null>;
  findByUids(uids: string[]): Promise<User[]>;
  findAll(queryString?: string): Promise<User[]>;
  findAllForStudyEngage();
  findAllForGatherNotification();
  updateUser(uid: string, updateInfo: any): Promise<null>;
  findByIsActiveUid(
    uid: string,
    isActive: boolean,
    queryString?: string,
  ): Promise<User[]>;
  findByIsActive(isActive: boolean, queryString?: string): Promise<User[]>;
  create(user: User): Promise<User>;
  save(user: User): Promise<User>;
  resetMonthScore();
  resetMonthStudyRecord();
  incrementStudyBadge(userId: string, count?: number);
  findStudyBadgeByUid(uid: string);
  findStudyBadgeRanking(limit: number);
  countStudyBadgeAbove(monthCnt: number, lastAt: Date | null);
  resetStudyBadge();
  findByUidProjection(
    uid: string,
    projection?: string,
  ): Promise<Partial<Record<keyof User, any>> | null>;
  resetPointByMonthScore(maxDate: string);
  incrementPointByUid(uid: string, delta: number): Promise<void>;
  incrementPointByUserId(userId: string, delta: number): Promise<void>;
  resetTemperature(): Promise<null>;
  processMonthScore();
  findMonthPrize(ranks: any[]);
  updateUser(uid: string, updateInfo: any): Promise<null>;
  updateLocationDetailAll();
  test(): Promise<any>;

  findAllForPrize();
  initMembership(): Promise<null>;
  resetNegativePoint(): Promise<void>;
  findAllNicknames(): Promise<string[]>;
}
