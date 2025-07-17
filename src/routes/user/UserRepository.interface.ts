import { User } from 'src/domain/entities/User/User';

export interface IUserRepository {
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
  processTicket();
  resetMonthScore();
  findByUidProjection(
    uid: string,
    projection?: string,
  ): Promise<Partial<Record<keyof User, any>> | null>;
  resetPointByMonthScore(maxDate: string);
  updateUser(uid: string, updateInfo: any): Promise<null>;
  updateGroupStudyTicket(uid: string, value: number);
  updateTicketWithUserIds(userIds: string[], ticketNum: number);
}
