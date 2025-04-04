// src/domain/entities/PollItem.ts

export interface PollItemProps {
  id?: string; // _id (ObjectId)
  name: string;
  users?: string[]; // DB에서 ObjectId[], domain에서 string[]
}

export class PollItem {
  private id?: string;
  private name: string;
  private users: string[];

  constructor(props: PollItemProps) {
    if (!props.name) {
      throw new Error('PollItem name is required');
    }
    this.id = props.id; // optional
    this.name = props.name;
    this.users = props.users ?? [];
  }

  getId(): string | undefined {
    return this.id;
  }
  getName(): string {
    return this.name;
  }
  getUsers(): string[] {
    return this.users;
  }

  addUser(userId: string): void {
    if (!this.users.includes(userId)) {
      this.users.push(userId);
    }
  }

  toPrimitives(): PollItemProps {
    return {
      id: this.id,
      name: this.name,
      users: [...this.users],
    };
  }
}
