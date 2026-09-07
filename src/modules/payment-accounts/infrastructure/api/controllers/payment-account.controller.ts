import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
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
import { PaymentAccountsService } from '../../../application/payment-accounts.service';
import { CreatePaymentAccountDto } from '../dto/create-payment-account.dto';
import { UpdatePaymentAccountDto } from '../dto/update-payment-account.dto';
import { PaymentAccountResponseDto } from '../dto/payment-account-response.dto';

@ApiTags('Payment Accounts')
@Controller('payment-accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class PaymentAccountController {
  constructor(private readonly service: PaymentAccountsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a payment account (Nequi/Daviplata/bank) guardians can transfer to' })
  @ApiCreatedResponse({ type: PaymentAccountResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(
    @Body() dto: CreatePaymentAccountDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PaymentAccountResponseDto> {
    const account = await this.service.create(dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(PaymentAccountResponseDto, account, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'List payment accounts for a company',
    description:
      'Guardians and drivers only ever see active accounts, regardless of the value ' +
      'sent — only an admin/super_admin of that company sees inactive ones too.',
  })
  @ApiOkResponse({ type: [PaymentAccountResponseDto] })
  @ApiQuery({ name: 'companyId', required: true, description: 'Company UUID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findAll(
    @Query('companyId') companyId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PaymentAccountResponseDto[]> {
    if (!companyId) {
      throw new BadRequestException('companyId is required');
    }

    const isCompanyAdmin =
      (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN) &&
      currentUser.companyId === companyId;
    const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;

    const accounts = await this.service.findAll(companyId, !(isCompanyAdmin || isSuperAdmin));
    return plainToInstance(PaymentAccountResponseDto, accounts, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a payment account' })
  @ApiOkResponse({ type: PaymentAccountResponseDto })
  @ApiNotFoundResponse({ description: 'Payment account not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentAccountDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PaymentAccountResponseDto> {
    const account = await this.service.update(id, dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(PaymentAccountResponseDto, account, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete a payment account' })
  @ApiNoContentResponse({ description: 'Payment account deleted successfully' })
  @ApiNotFoundResponse({ description: 'Payment account not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.service.softDelete(id, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
  }
}
