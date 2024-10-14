export interface ILogService {
  getMonthScoreLog(): Promise<any>;
  getLog(type: string): Promise<any>;
  getAllLog(type: string): Promise<any>;
}
