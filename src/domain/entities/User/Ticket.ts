// src/domain/entities/Ticket.ts

export interface TicketProps {
  gatherTicket: number;
  groupStudyTicket: number;
}

export class Ticket {
  private gatherTicket: number;
  private groupStudyTicket: number;

  constructor(props: TicketProps) {
    this.gatherTicket = props.gatherTicket ?? 2;
    this.groupStudyTicket = props.groupStudyTicket ?? 4;
  }

  getGatherTicket(): number {
    return this.gatherTicket;
  }
  getGroupStudyTicket(): number {
    return this.groupStudyTicket;
  }

  toPrimitives(): TicketProps {
    return {
      gatherTicket: this.gatherTicket,
      groupStudyTicket: this.groupStudyTicket,
    };
  }
}
