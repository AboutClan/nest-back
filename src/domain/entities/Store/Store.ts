import { IApplicant } from './Applicant';

export type IStoreStatus = 'pending' | 'processed' | 'end';

export interface IStore {
  _id?: string | null;
  name: string;
  image: string;
  point: number;
  winnerCnt: number;
  max: number;
  status?: IStoreStatus;
  applicants?: IApplicant[];
  winner?: string[];
}

export class Store {
  public _id?: string | null;
  public name: string;
  public image: string;
  public point: number;
  public winnerCnt: number;
  public status: IStoreStatus;
  public applicants: IApplicant[];
  public max: number;
  public winner?: string[];

  constructor({
    _id,
    name,
    image,
    point,
    winnerCnt,
    status,
    applicants,
    max,
    winner,
  }: IStore) {
    this._id = _id;
    this.name = name;
    this.image = image || '';
    this.point = point;
    this.winnerCnt = winnerCnt;
    this.status = status || 'pending';
    this.applicants = applicants || [];
    this.max = max;
    this.winner = winner || [];
  }
}
