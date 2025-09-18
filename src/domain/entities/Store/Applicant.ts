export interface IApplicant {
  user: string;
  cnt: number;
}

export class Applicant {
  public user: string;
  public cnt: number;

  constructor({ user, cnt }: IApplicant) {
    this.user = user;
    this.cnt = cnt;
  }
}
