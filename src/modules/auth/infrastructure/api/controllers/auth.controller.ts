import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { AuthService } from '../../../application/auth.service';
import { UserResponseDto } from '../../../../user/infrastructure/api/dto/user-response.dto';
import { AuthResponseDto, RefreshResponseDto } from '../dto/auth-response.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or inactive account',
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    const { tokens, user } = await this.authService.login(dto);
    return {
      ...tokens,
      tokenType: 'Bearer',
      user: plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      }),
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a new token pair using a refresh token',
    description:
      'Validates the refresh token and issues new access + refresh tokens. ' +
      'Token rotation and revocation are planned for a future release.',
  })
  @ApiOkResponse({ type: RefreshResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<RefreshResponseDto> {
    const tokens = await this.authService.refresh(dto);
    return { ...tokens, tokenType: 'Bearer' };
  }
}
