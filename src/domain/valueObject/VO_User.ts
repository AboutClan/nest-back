export class VO_User {
  constructor(private readonly _id: string) {
    if (!_id) throw new Error('UserId는 빈 문자열일 수 없습니다.');
  }
  toString(): string {
    return this._id;
  }
  equals(other: VO_User): boolean {
    return this._id === other._id;
  }
}
