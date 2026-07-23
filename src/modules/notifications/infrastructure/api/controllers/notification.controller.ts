import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../common/guards/roles.guard';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../../user/domain/enums/user-role.enum';
import { NotificationsService } from '../../../application/notifications.service';
import { VehicleDocumentExpiryScanner } from '../../../application/vehicle-document-expiry.scanner';
import { NotificationResponseDto } from '../dto/notification-response.dto';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly documentExpiryScanner: VehicleDocumentExpiryScanner,
  ) {}

  @Post('scan/vehicle-documents')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Run the vehicle document expiry scan immediately',
    description:
      'Normally runs once a day on a schedule. Forces it to run now, ' +
      'across every company — useful right after registering a vehicle ' +
      "whose documents are already within the alert window. Safe to run " +
      'more than once: notifications already created for a given ' +
      'vehicle/document/expiration-date are skipped.',
  })
  @ApiOkResponse({ schema: { example: { scanned: true } } })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async scanVehicleDocuments(): Promise<{ scanned: true }> {
    await this.documentExpiryScanner.scan();
    return { scanned: true };
  }

  @Get()
  @ApiOperation({
    summary: 'List notifications for the authenticated company',
  })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiOkResponse({ type: [NotificationResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<NotificationResponseDto[]> {
    const companyId = this.requireCompanyId(currentUser);

    const notifications = await this.notificationsService.findForCompany(
      companyId,
      {
        unreadOnly: unreadOnly === 'true',
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      },
    );
    return plainToInstance(NotificationResponseDto, notifications, {
      excludeExtraneousValues: true,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get the unread notification count' })
  @ApiOkResponse({ schema: { example: { count: 3 } } })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async unreadCount(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<{ count: number }> {
    const companyId = this.requireCompanyId(currentUser);
    const count = await this.notificationsService.getUnreadCount(companyId);
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async markAsRead(
    @CurrentUser() currentUser: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationResponseDto> {
    const companyId = this.requireCompanyId(currentUser);
    const notification = await this.notificationsService.markAsRead(
      id,
      companyId,
    );
    return plainToInstance(NotificationResponseDto, notification, {
      excludeExtraneousValues: true,
    });
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark every notification as read' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async markAllAsRead(@CurrentUser() currentUser: JwtPayload): Promise<void> {
    const companyId = this.requireCompanyId(currentUser);
    await this.notificationsService.markAllAsRead(companyId);
  }

  private requireCompanyId(currentUser: JwtPayload): string {
    if (!currentUser.companyId) {
      throw new BadRequestException('User is not associated with a company');
    }
    return currentUser.companyId;
  }
}
