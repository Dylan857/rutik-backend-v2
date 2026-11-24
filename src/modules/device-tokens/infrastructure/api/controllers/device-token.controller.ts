import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
import { DeviceTokensService } from '../../../application/device-tokens.service';
import { RegisterDeviceTokenDto } from '../dto/register-device-token.dto';

@ApiTags('Device Tokens')
@Controller('device-tokens')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class DeviceTokenController {
  constructor(private readonly service: DeviceTokensService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Register (or refresh) this device\'s FCM token for the current user' })
  @ApiNoContentResponse({ description: 'Token registered' })
  async register(
    @Body() dto: RegisterDeviceTokenDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.service.registerToken(currentUser.sub, dto.token, dto.platform);
  }

  @Delete(':token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unregister a device token (called on logout)' })
  @ApiNoContentResponse({ description: 'Token removed' })
  async remove(@Param('token') token: string): Promise<void> {
    await this.service.removeToken(token);
  }
}
