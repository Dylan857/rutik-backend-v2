import { VerificationCode } from '../verification-code.entity';
import { VerificationPurpose } from '../enums/verification-purpose.enum';

export interface IVerificationCodeRepository {
  create(data: Partial<VerificationCode>): Promise<VerificationCode>;
  findLatestByUserAndPurpose(
    userId: string,
    purpose: VerificationPurpose,
  ): Promise<VerificationCode | null>;
  /** Direct lookup by exact hash — for deterministic (non-bcrypt) hashes like account-activation tokens. */
  findByHash(
    codeHash: string,
    purpose: VerificationPurpose,
  ): Promise<VerificationCode | null>;
  incrementAttempts(id: string): Promise<void>;
  deleteByUserAndPurpose(
    userId: string,
    purpose: VerificationPurpose,
  ): Promise<void>;
}

export const VERIFICATION_CODE_REPOSITORY = Symbol(
  'VERIFICATION_CODE_REPOSITORY',
);
