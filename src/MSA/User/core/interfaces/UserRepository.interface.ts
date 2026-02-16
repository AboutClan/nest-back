import { User } from 'src/MSA/User/core/domain/User/User';

export interface IUserRepository {
  findById(userId: string): Promise<User>;
  findByUid(uid: string, queryString?: string): Promise<User | null>;
  findByUserId(userId: string): Promise<User | null>;
  findByUids(uids: string[]): Promise<User[]>;
  findAll(queryString?: string): Promise<User[]>;
  findAllForTicket();
  findAllForStudyEngage();
  updateUser(uid: string, updateInfo: any): Promise<null>;
  findByIsActiveUid(
    uid: string,
    isActive: boolean,
    queryString?: string,
  ): Promise<User[]>;
  findByIsActive(isActive: boolean, queryString?: string): Promise<User[]>;
  create(user: User): Promise<User>;
  save(user: User): Promise<User>;
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
  updateGatherTicket(uid: string, value: number);
  updateGroupStudyTicket(uid: string, value: number);
  updateTicketWithUserIds(userIds: string[], ticketNum: number);
  updateLocationDetailAll();
  test(): Promise<any>;

  findAllForPrize();
  initMembership(): Promise<null>;
}
