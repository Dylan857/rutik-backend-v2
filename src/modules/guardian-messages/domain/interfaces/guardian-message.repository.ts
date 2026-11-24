import { GuardianMessage } from '../guardian-message.entity';
import { GuardianMessageStatus } from '../enums/guardian-message.enums';

export interface GuardianMessageFilters {
  companyId?: string;
  guardianUserId?: string;
  status?: GuardianMessageStatus;
}

export interface IGuardianMessageRepository {
  create(data: Partial<GuardianMessage>): Promise<GuardianMessage>;
  // Loads `guardianUser` and `student` — the inbox shows who wrote and about whom.
  findAll(filters: GuardianMessageFilters): Promise<GuardianMessage[]>;
  findById(id: string): Promise<GuardianMessage | null>;
  update(id: string, data: Partial<GuardianMessage>): Promise<GuardianMessage>;
}

export const GUARDIAN_MESSAGE_REPOSITORY = Symbol(
  'GUARDIAN_MESSAGE_REPOSITORY',
);
