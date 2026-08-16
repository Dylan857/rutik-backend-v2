// Shape services expect from controllers to attribute an audit-log entry.
// Controllers build this from @CurrentUser() (JwtPayload.sub / .email).
export interface AuditActor {
  userId: string;
  email: string;
}
