import { distinct } from 'rxjs';

export const SCHEDULE_CONST = {
  VOTE_RESULT: 'Vote Result Scheduler',
  GATHER_TICKET_RESULT: 'Gather Ticket Reset Scheduler',
  INIT_TARGET_HOUR: 'Weekly Target Hour Reset Scheduler',
  INIT_GROUP_STUDY_ATTENDANCE: 'Weekly Group Study Attendance Reset Scheduler',
  UPDATE_GROUP_STUDY_STATUS: 'Group Study Status Update Scheduler',
  DISTRIBUTE_GATHER_DEPOSIT: 'Gather Deposit Distribution Scheduler',
  PROCESS_TEMPERATURE: 'Temperature Processing Scheduler',
  PROCESS_MONTH_SCORE: 'Monthly Score Processing Scheduler',
  PROCESS_TICKET: 'Ticket Processing Scheduler',
  PROCESS_GROUP_ATTENDANCE: 'Group Attendance Processing Scheduler',
  BACKUP_DATABASE: 'BACKUP_DATABASE',
  PROCESS_VOTE_RESULT: 'Vote Result Processing Scheduler',
  PROCESS_STUDY_ABSENCE: 'Study Absence Processing Scheduler',
  PROCESS_ABSENCE_FEE: 'Absence Fee Processing Scheduler',
};
