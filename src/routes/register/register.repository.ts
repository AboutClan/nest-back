import { IRegistered } from './register.entity';

export interface RegisterRepository {
  updateByUid(uid: string, data: any): Promise<null>;
  findByUid(uid: string): Promise<IRegistered>;
  deleteByUidWithSession(uid: string, session: any): Promise<null>;
  deleteByUid(uid: string): Promise<null>;
  findAll(): Promise<IRegistered[]>;
}
