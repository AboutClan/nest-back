import { IUser } from 'src/user/user.entity';

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
  getChat(userId: string): Promise<any>;
  getChats(): Promise<any>;
  getRecentChat(): Promise<any>;
  createChat(toUserId: string, message: string): Promise<any>;
}
