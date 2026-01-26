export interface ILogMembershipRepository {
  findByUserId(userId: string);
  create(logMembership);
}