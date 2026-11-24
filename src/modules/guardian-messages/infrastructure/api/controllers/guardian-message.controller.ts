import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../common/guards/roles.guard';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../../user/domain/enums/user-role.enum';
import { GuardianMessagesService } from '../../../application/guardian-messages.service';
import { GuardianMessageStatus } from '../../../domain/enums/guardian-message.enums';
import {
  CreateGuardianMessageDto,
  GuardianMessageResponseDto,
} from '../dto/guardian-message.dto';

@ApiTags('Guardian Messages')
@Controller('guardian-messages')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
export class GuardianMessageController {
  constructor(private readonly service: GuardianMessagesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.GUARDIAN)
  @ApiOperation({
    summary:
      'Send a concern (inquietud) or complaint (incomodidad) to the company',
  })
  @ApiCreatedResponse({ type: GuardianMessageResponseDto })
  async create(
    @Body() dto: CreateGuardianMessageDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<GuardianMessageResponseDto> {
    return this.service.create(currentUser.sub, currentUser.companyId, dto);
  }

  @Get('me')
  @Roles(UserRole.GUARDIAN)
  @ApiOperation({ summary: 'Messages the caller has sent' })
  @ApiOkResponse({ type: [GuardianMessageResponseDto] })
  async findMine(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<GuardianMessageResponseDto[]> {
    return this.service.findMine(currentUser.sub);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: "Inbox: a company's guardian messages, newest first",
  })
  @ApiQuery({ name: 'status', required: false, enum: GuardianMessageStatus })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  @ApiOkResponse({ type: [GuardianMessageResponseDto] })
  async findForCompany(
    @CurrentUser() currentUser: JwtPayload,
    @Query(
      'status',
      new ParseEnumPipe(GuardianMessageStatus, { optional: true }),
    )
    status?: GuardianMessageStatus,
    @Query('companyId') companyId?: string,
  ): Promise<GuardianMessageResponseDto[]> {
    const scopedCompanyId =
      currentUser.role === UserRole.SUPER_ADMIN
        ? companyId
        : currentUser.companyId;
    if (!scopedCompanyId) {
      throw new BadRequestException('companyId is required');
    }
    return this.service.findForCompany(scopedCompanyId, status);
  }

  @Patch(':id/resolve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mark a guardian message as resolved' })
  @ApiOkResponse({ type: GuardianMessageResponseDto })
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<GuardianMessageResponseDto> {
    return this.service.resolve(id, {
      userId: currentUser.sub,
      companyId: currentUser.companyId,
      isSuperAdmin: currentUser.role === UserRole.SUPER_ADMIN,
    });
  }
}
