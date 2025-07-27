import { SquarePollItem } from './SquarePollItem';

export interface SquarePollProps {
  pollItems: Array<{
    _id?: string;
    name: string;
    users: string[];
  }>;
  canMultiple: boolean;
}

export class SquarePoll {
  pollItems: SquarePollItem[];
  canMultiple: boolean;

  constructor(props: SquarePollProps) {
    this.pollItems =
      props.pollItems?.map((item) => new SquarePollItem(item)) || [];
    this.canMultiple = props.canMultiple || false;
  }

  addPollItem(item: SquarePollItem) {
    this.pollItems.push(item);
  }

  removePollItem(itemId: string) {
    this.pollItems = this.pollItems.filter((item) => item._id !== itemId);
  }

  addUserToPollItem(itemId: string, userId: string) {
    const item = this.pollItems.find((pollItem) => pollItem._id === itemId);
    if (item) {
      item.addUser(userId);
    }
  }

  removeUserFromPollItem(itemId: string, userId: string) {
    const item = this.pollItems.find((pollItem) => pollItem._id === itemId);
    if (item) {
      item.removeUser(userId);
    }
  }

  updateCanMultiple(canMultiple: boolean) {
    this.canMultiple = canMultiple;
  }

  toPrimitives(): SquarePollProps {
    return {
      pollItems: this.pollItems.map((item) => item.toPrimitives()),
      canMultiple: this.canMultiple,
    };
  }
}
