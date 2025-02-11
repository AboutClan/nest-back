import { IRequestData } from './request.entity';

export interface IRequestService {
  getRequest(): Promise<IRequestData[]>;
  createRequest(data: any): Promise<void>;
}
