export interface INoticeService {
  findActiveLog(): Promise<any>;
  getActiveLog(): Promise<any>;
  deleteLike(to: string): Promise<void>;
  setLike(to: string, message: string): Promise<void>;
  getLike(): Promise<any>;
  getLikeAll(): Promise<any>;
  getFriendRequest(): Promise<any>;
  requestNotice(
    type: 'friend' | 'alphabet',
    toUid: string,
    message: string,
    sub?: string,
  ): Promise<void>;
  updateRequestFriend(
    type: 'friend' | 'alphabet',
    from: string,
    status: string,
  ): Promise<string | void>;
}
