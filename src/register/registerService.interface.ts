import { IRegistered } from './register.entity';

export interface IRegisterService {
  encodeByAES56(tel: string): Promise<string>;
  decodeByAES256(encodedTel: string): Promise<string>;
  register(
    subRegisterForm: Omit<IRegistered, 'uid' | 'profileImage'>,
  ): Promise<void>;
  approve(uid: string): Promise<void>;
  deleteRegisterUser(uid: string, approve: boolean): Promise<void>;
  getRegister(): Promise<IRegistered[]>;
}
