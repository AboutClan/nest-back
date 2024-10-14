import { IUser } from 'src/user/entity/user.entity';

export interface IChatContent {
  content: string;
  userId: string;
  createdAt?: Date;
}

export interface IChatWithUser {
  user: IUser | null;
  content: IChatContent | null;
}

export interface IChatResponse {
  opponent: IUser;
  contents: IChatContent[];
}

export interface IChatService {
  getChat(userId: string): Promise<IChatResponse>;
  getChats(): Promise<IChatWithUser[]>;
  getRecentChat(): Promise<string>;
  createChat(toUserId: string, message: string): Promise<void>;
}
