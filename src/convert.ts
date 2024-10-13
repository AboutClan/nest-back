import { avatarType, IUser } from './user/entity/user.entity';

export interface IUserSummary2 extends IUserSummary {
  birth: string;
  comment: string;
  isActive?: boolean;
  location: string;
  score: number;
  monthScore: number;
}

export interface IUserSummary {
  uid: string;
  _id: string;
  avatar: avatarType;
  name: string;
  profileImage: string;
}

export const convertUsersToSummary = (users: IUser[]): IUserSummary[] => {
  return users?.map((user) => {
    const { avatar, name, profileImage, uid, _id } = user;
    return {
      avatar,
      name,
      profileImage,
      _id,
      uid,
    };
  });
};
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

export const convertUserToSummary2 = (user: IUser): IUserSummary2 => {
  const {
    birth,
    avatar,
    comment,
    isActive,
    location,
    name,
    profileImage,
    score,
    uid,
    _id,
    monthScore,
  } = user;

  return {
    birth,
    avatar,
    comment,
    isActive,
    location,
    name,
    profileImage,
    score,
    _id,
    uid,
    monthScore,
  };
};
