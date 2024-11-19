export interface IDailyCheckService {
  setDailyCheck(): Promise<any>;
  getLog(): Promise<any>;
  getAllLog(): Promise<any>;
}
