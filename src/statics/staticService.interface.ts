export interface IStaticService {
  roleCheck(): Promise<boolean>;
  aggregateLogs(
    message: string,
    groupFields: string[],
    period: { firstDay: Date; lastDay: Date },
  ): Promise<any[]>;
  getFirstAndLastDay(dateString?: string): { firstDay: Date; lastDay: Date };
  getUserInSameLocation(date: string): Promise<any>;
  monthlyStatics(): Promise<void>;
}
