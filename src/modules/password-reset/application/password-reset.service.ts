import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomInt, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../../../shared/mail/mail.service';
import { UserService } from '../../user/application/user.service';
import { User } from '../../user/domain/user.entity';
import { VerificationPurpose } from '../domain/enums/verification-purpose.enum';
import { VerificationCode } from '../domain/verification-code.entity';
import {
  IVerificationCodeRepository,
  VERIFICATION_CODE_REPOSITORY,
} from '../domain/interfaces/verification-code.repository';

const BCRYPT_ROUNDS = 10;
const CODE_EXPIRATION_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const INVALID_CODE_MESSAGE = 'Invalid or expired code';
const ACTIVATION_TOKEN_EXPIRATION_DAYS = 7;
const INVALID_TOKEN_MESSAGE = 'Invalid or expired activation link';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class PasswordResetService {
  constructor(
    @Inject(VERIFICATION_CODE_REPOSITORY)
    private readonly verificationCodeRepository: IVerificationCodeRepository,
    private readonly userService: UserService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async requestReset(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    // Same response whether or not the user exists — prevents email enumeration.
    if (!user) return;

    await this.verificationCodeRepository.deleteByUserAndPurpose(
      user.id,
      VerificationPurpose.PASSWORD_RESET,
    );

    const code = randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
    const expiresAt = new Date(
      Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000,
    );

    await this.verificationCodeRepository.create({
      userId: user.id,
      codeHash,
      purpose: VerificationPurpose.PASSWORD_RESET,
      expiresAt,
    });

    await this.mailService.sendPasswordResetCode(user.email, code);
  }

  async verifyCode(email: string, code: string): Promise<{ valid: true }> {
    await this.validateCode(email, code);
    return { valid: true };
  }

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.validateCode(email, code);

    await this.userService.updatePassword(user.userId, newPassword);
    await this.verificationCodeRepository.deleteByUserAndPurpose(
      user.userId,
      VerificationPurpose.PASSWORD_RESET,
    );
  }

  async createActivationLink(user: User): Promise<void> {
    await this.verificationCodeRepository.deleteByUserAndPurpose(
      user.id,
      VerificationPurpose.ACCOUNT_ACTIVATION,
    );

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + ACTIVATION_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.verificationCodeRepository.create({
      userId: user.id,
      codeHash: hashToken(token),
      purpose: VerificationPurpose.ACCOUNT_ACTIVATION,
      expiresAt,
    });

    const activationUrl = `${this.configService.get<string>('app.parentsAppUrl')}/set-password?token=${token}`;
    await this.mailService.sendGuardianWelcome(user.email, user.firstName, activationUrl);
  }

  async activateAccount(token: string, newPassword: string): Promise<void> {
    const record = await this.verificationCodeRepository.findByHash(
      hashToken(token),
      VerificationPurpose.ACCOUNT_ACTIVATION,
    );

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    }

    await this.userService.updatePassword(record.userId, newPassword);
    await this.verificationCodeRepository.deleteByUserAndPurpose(
      record.userId,
      VerificationPurpose.ACCOUNT_ACTIVATION,
    );
  }

  private async validateCode(
    email: string,
    code: string,
  ): Promise<VerificationCode> {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new BadRequestException(INVALID_CODE_MESSAGE);

    const verificationCode =
      await this.verificationCodeRepository.findLatestByUserAndPurpose(
        user.id,
        VerificationPurpose.PASSWORD_RESET,
      );

    if (!verificationCode || verificationCode.expiresAt < new Date()) {
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    if (verificationCode.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Too many attempts. Please request a new code',
      );
    }

    const matches = await bcrypt.compare(code, verificationCode.codeHash);
    if (!matches) {
      await this.verificationCodeRepository.incrementAttempts(
        verificationCode.id,
      );
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    return verificationCode;
  }
}
