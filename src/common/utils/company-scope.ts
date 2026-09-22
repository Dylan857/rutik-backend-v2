import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../modules/user/domain/enums/user-role.enum';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

// Tenant isolation for read endpoints. SUPER_ADMIN operates across every
// company, so the companyId it asks for (or none, meaning "all") is honored.
// Every other role is pinned to the company in its token — a companyId sent
// in the query string is ignored so it can't be used to read another tenant.
export function resolveCompanyScope(
  user: JwtPayload,
  requestedCompanyId?: string,
): string | undefined {
  if (user.role === UserRole.SUPER_ADMIN) return requestedCompanyId;
  return requireUserCompanyId(user);
}

// Throws unless the resource belongs to the user's company. Responds 404 (not
// 403) so another tenant's IDs can't be probed for existence.
export function assertCompanyAccess(
  user: JwtPayload,
  resourceCompanyId: string | null | undefined,
): void {
  if (user.role === UserRole.SUPER_ADMIN) return;
  if (!resourceCompanyId || resourceCompanyId !== requireUserCompanyId(user)) {
    throw new NotFoundException('Resource not found');
  }
}

function requireUserCompanyId(user: JwtPayload): string {
  if (!user.companyId) {
    throw new ForbiddenException('User is not associated with a company');
  }
  return user.companyId;
}
