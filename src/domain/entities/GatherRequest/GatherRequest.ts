import { Types } from 'mongoose';

export interface IGatherRequest {
  _id: string;
  writer: string | Types.ObjectId;
  title: string;
  content: string;
  like: string[];
  createdAt: Date;
  prize: number;
  status: 'pending' | 'completed';
  isAnonymous: boolean;
}

export class GatherRequest {
  constructor({
    _id,
    writer,
    title,
    content,
    like = [],
    createdAt = new Date(),
    prize = 0,
    status,
    isAnonymous,
  }: IGatherRequest) {
    this._id = _id || null;
    this.writer = writer as string;
    this.title = title;
    this.content = content;
    this.like = like || [];
    this.createdAt = createdAt || null;
    this.prize = prize || 0;
    this.status = status || 'pending';
    this.isAnonymous = isAnonymous || false;
  }

  public _id: string;
  public writer: string;
  public title: string;
  public content: string;
  public like: string[];
  public createdAt: Date;
  public prize: number;
  public status: 'pending' | 'completed';
  public isAnonymous: boolean;

  toggleLike(userId: string): 'remove' | 'add' {
    const index = this.like.indexOf(userId);
    if (index > -1) {
      this.like.splice(index, 1); // Remove userId if already liked
      return 'remove';
    } else {
      this.like.push(userId); // Add userId to likes
      return 'add';
    }
  }
  addLike(userId: string): void {
    this.like.push(userId);
  }
}
