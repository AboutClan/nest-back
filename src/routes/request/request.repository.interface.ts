import { IRequestData } from './request.entity';

export interface RequestRepository {
  findAll(): Promise<IRequestData[]>;
  create(data: any): Promise<IRequestData>;
  setCheck(id: string): Promise<null>;
}
