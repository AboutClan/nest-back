export class Ticket {
  constructor(
    public gatherTicket?: number,
    public groupStudyTicket?: number,
  ) {
    this.gatherTicket = gatherTicket ?? 2;
    this.groupStudyTicket = groupStudyTicket ?? 4;
  }

  toPrimitives() {
    return {
      gatherTicket: this.gatherTicket,
      groupStudyTicket: this.groupStudyTicket,
    };
  }
}

export interface ITicket {
  gatherTicket?: number;
  groupStudyTicket?: number;
}
