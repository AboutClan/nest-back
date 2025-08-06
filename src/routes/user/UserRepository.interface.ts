import { User } from 'src/domain/entities/User/User';

export interface IUserRepository {
  findById(userId: string): Promise<User>;
  findByUid(uid: string, queryString?: string): Promise<User | null>;
  findByUserId(userId: string): Promise<User | null>;
  findByUids(uids: string[]): Promise<User[]>;
  findAll(queryString?: string): Promise<any>;
  updateUser(uid: string, updateInfo: any): Promise<null>;
  findByIsActiveUid(
    uid: string,
    isActive: boolean,
    queryString?: string,
  ): Promise<User[]>;
  findByIsActive(isActive: boolean, queryString?: string): Promise<User[]>;
  create(user: User): Promise<User>;
  save(user: User): Promise<User>;
  initMonthScore(): Promise<null>;
  resetGatherTicket(): Promise<null>;
  processTicket(whiteList: any);
  resetMonthScore();
  findByUidProjection(
    uid: string,
    projection?: string,
  ): Promise<Partial<Record<keyof User, any>> | null>;
  resetPointByMonthScore(maxDate: string);
  resetTemperature(): Promise<null>;
  processMonthScore();
  findMonthPrize(ranks: any[]);
  updateUser(uid: string, updateInfo: any): Promise<null>;
  updateGroupStudyTicket(uid: string, value: number);
  updateTicketWithUserIds(userIds: string[], ticketNum: number);
}
