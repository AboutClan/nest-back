export interface SquarePollItemProps {
  _id?: string;
  name: string;
  users: string[];
}

export class SquarePollItem {
  _id?: string;
  name: string;
  users: string[];

  constructor(props: SquarePollItemProps) {
    this._id = props._id;
    this.name = props.name;
    this.users = props.users || [];
  }

  addUser(userId: string) {
    if (!this.users.includes(userId)) {
      this.users.push(userId);
    }
  }

  removeUser(userId: string) {
    this.users = this.users.filter((id) => id !== userId);
  }

  updateName(name: string) {
    this.name = name;
  }

  getUserCount(): number {
    return this.users.length;
  }

  hasUser(userId: string): boolean {
    return this.users.includes(userId);
  }

  toPrimitives(): SquarePollItemProps {
    return {
      _id: this._id,
      name: this.name,
      users: this.users,
    };
  }
}
