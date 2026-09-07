import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PasswordResetService } from '../../../application/password-reset.service';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { VerifyResetCodeDto } from '../dto/verify-reset-code.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ActivateAccountDto } from '../dto/activate-account.dto';

@ApiTags('Auth')
@Controller('auth')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a password reset code by email',
    description:
      'Always responds with a generic message, whether or not the email exists.',
  })
  @ApiOkResponse({ description: 'Reset code sent if the email exists' })
  async forgotPassword(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    await this.passwordResetService.requestReset(dto.email);
    return {
      message: 'If that email exists, a verification code has been sent',
    };
  }

  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a password reset code' })
  @ApiOkResponse({ description: 'Code is valid' })
  async verifyResetCode(
    @Body() dto: VerifyResetCodeDto,
  ): Promise<{ valid: true }> {
    return this.passwordResetService.verifyCode(dto.email, dto.code);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset the password using a verified code' })
  @ApiOkResponse({ description: 'Password updated' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.passwordResetService.resetPassword(
      dto.email,
      dto.code,
      dto.newPassword,
    );
    return { message: 'Password updated successfully' };
  }

  @Post('activate-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set the initial password for an account using an activation link token',
  })
  @ApiOkResponse({ description: 'Account activated' })
  async activateAccount(
    @Body() dto: ActivateAccountDto,
  ): Promise<{ message: string }> {
    await this.passwordResetService.activateAccount(dto.token, dto.newPassword);
    return { message: 'Account activated successfully' };
  }
}
