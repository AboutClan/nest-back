// src/domain/entities/Badge.ts

export interface BadgeProps {
  badgeIdx: number;
  badgeList: number[];
}

export class Badge {
  private badgeIdx: number;
  private badgeList: number[];

  constructor(props: BadgeProps) {
    this.badgeIdx = props.badgeIdx;
    this.badgeList = props.badgeList ?? [];
  }

  getBadgeIdx(): number {
    return this.badgeIdx;
  }
  getBadgeList(): number[] {
    return this.badgeList;
  }

  toPrimitives(): BadgeProps {
    return {
      badgeIdx: this.badgeIdx,
      badgeList: [...this.badgeList],
    };
  }
}
