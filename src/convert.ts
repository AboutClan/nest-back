import { avatarType, IUser } from './user/user.entity';

export interface IUserSummary {
  uid: string;
  _id: string;
  avatar: avatarType;
  name: string;
  profileImage: string;
  score: number;
}

export const convertUserToSummary = (user: IUser): IUserSummary => {
  const { avatar, name, profileImage, uid, _id, score } = user;
  return {
    avatar,
    score,
    name,
    profileImage,
    _id,
    uid,
  };
};
