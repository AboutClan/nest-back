export class Badge {
  constructor(
    public badgeIdx?: number,
    public badgeList?: string[],
  ) {
    this.badgeIdx = badgeIdx ?? 0;
    this.badgeList = badgeList || [];
  }

  addBadge(badgeName) {
    if (!this.badgeList.includes(badgeName)) {
      this.badgeList.push(badgeName);
    }
  }
  selectBadge(badgeIdx) {
    this.badgeIdx = badgeIdx;
  }

  toPrimitives() {
    return { badgeIdx: this.badgeIdx, badgeList: this.badgeList };
  }
}

export interface IBadge {
  badgeIdx?: number;
  badgeList?: string[];
}
