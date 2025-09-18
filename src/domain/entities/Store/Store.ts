import { Applicant, IApplicant } from './Applicant';

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

  calcRemain(cnt: number) {
    let totalCnt = this.applicants.reduce(
      (acc, applicant) => acc + applicant.cnt,
      0,
    );

    if (totalCnt + cnt > this.max) return this.max - totalCnt;

    return cnt;
  }

  addApplicant(userId: string, cnt: number) {
    const votedCnt = this.calcRemain(cnt);

    const applicant = new Applicant({ user: userId, cnt: votedCnt });

    const existingApplicant = this.applicants.find(
      (applicant) =>
        (applicant.user as any)._id.toString() === userId.toString(),
    );
    if (existingApplicant) {
      existingApplicant.cnt += votedCnt;
    } else {
      this.applicants.push(applicant);
    }

    return votedCnt;
  }

  announceWinner() {
    // cnt 개수만큼 userId를 중복으로 넣은 배열 생성
    const userIdPool: string[] = [];
    this.applicants.forEach((applicant) => {
      for (let i = 0; i < applicant.cnt; i++) {
        userIdPool.push(applicant.user);
      }
    });

    // Fisher-Yates 셔플 알고리즘으로 완전히 랜덤하게 섞기
    for (let i = userIdPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [userIdPool[i], userIdPool[j]] = [userIdPool[j], userIdPool[i]];
    }

    // winnerCnt만큼 선택 (중복 당첨 가능)
    this.winner = userIdPool.slice(0, this.winnerCnt);
    this.status = 'processed';
  }
}
