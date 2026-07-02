import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserService } from '../../user/application/user.service';
import { UserStatus } from '../../user/domain/enums/user-status.enum';
import { User } from '../../user/domain/user.entity';
import { LoginDto } from '../infrastructure/api/dto/login.dto';
import { RefreshTokenDto } from '../infrastructure/api/dto/refresh-token.dto';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<{ tokens: TokenPair; user: User }> {
    const user = await this.validateCredentials(dto.email, dto.password);
    const tokens = this.generateTokens(user);

    // fire-and-forget — failure here must not block the login response
    void this.userService.updateLastLogin(user.id);

    return { tokens, user };
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.userService.findById(payload.sub);
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('User account is inactive');
      }

      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async validateCredentials(
    email: string,
    password: string,
  ): Promise<User> {
    const user = await this.userService.findByEmail(email);

    // Identical error message for missing user and wrong password prevents user enumeration
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is inactive');
    }

    return user;
  }

  private generateTokens(user: User): TokenPair {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    const accessToken = this.jwtService.sign(payload);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret', 'fallback'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn', '7d'),
    } as any);

    return { accessToken, refreshToken };
  }
}
