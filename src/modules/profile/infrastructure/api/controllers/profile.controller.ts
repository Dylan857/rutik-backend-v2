import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
import { ProfileService } from '../../../application/profile.service';
import {
  ChangePasswordDto,
  ProfileResponseDto,
  UpdateProfileDto,
} from '../dto/profile.dto';

// /me rather than /users/me: UserController's PATCH /users/:id would catch
// "me" first. Any authenticated role may use it.
@ApiTags('Profile')
@Controller('me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Get()
  @ApiOperation({
    summary: "The signed-in user's profile (plus license info for drivers)",
  })
  @ApiOkResponse({ type: ProfileResponseDto })
  async get(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<ProfileResponseDto> {
    return this.service.getProfile(currentUser.sub);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update own name and phone',
    description: 'Email and document can only be changed by the company admin.',
  })
  @ApiOkResponse({ type: ProfileResponseDto })
  async update(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<ProfileResponseDto> {
    return this.service.updateProfile(
      { userId: currentUser.sub, email: currentUser.email },
      dto,
    );
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change own password (requires the current one)' })
  @ApiNoContentResponse({ description: 'Password changed' })
  @ApiBadRequestResponse({
    description: 'Current password is wrong, or new one is the same',
  })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.service.changePassword(currentUser.sub, dto);
  }
}
