// src/domain/entities/Poll.ts
import { PollItem, PollItemProps } from './PollItem';

export interface PollProps {
  pollItems: PollItemProps[];
  canMultiple: boolean;
}

export class Poll {
  private pollItems: PollItem[];
  private canMultiple: boolean;

  constructor(props: PollProps) {
    if (!props.pollItems || props.pollItems.length === 0) {
      throw new Error('Poll requires at least one PollItem');
    }
    this.pollItems = props.pollItems.map((pi) => new PollItem(pi));
    this.canMultiple = props.canMultiple;
  }

  getPollItems(): PollItem[] {
    return this.pollItems;
  }
  getCanMultiple(): boolean {
    return this.canMultiple;
  }

  addPollItem(item: PollItemProps): void {
    this.pollItems.push(new PollItem(item));
  }

  toPrimitives(): {
    pollItems: PollItemProps[];
    canMultiple: boolean;
  } {
    return {
      pollItems: this.pollItems.map((pi) => pi.toPrimitives()),
      canMultiple: this.canMultiple,
    };
  }
}
