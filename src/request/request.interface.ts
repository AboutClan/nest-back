import { IRequestData } from './entity/request.entity';

export interface IRequestService {
  getRequest(): Promise<IRequestData[]>;
  createRequest(data: any): Promise<void>;
}
