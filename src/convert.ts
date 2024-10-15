import { avatarType, IUser } from './user/entity/user.entity';

export interface IUserSummary {
  uid: string;
  _id: string;
  avatar: avatarType;
  name: string;
  profileImage: string;
}

export const convertUserToSummary = (user: IUser): IUserSummary => {
  const { avatar, name, profileImage, uid, _id } = user;
  return {
    avatar,
    name,
    profileImage,
    _id,
    uid,
  };
};
