import {
  BadRequestException,
  Body,
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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { StudentAbsencesService } from '../../../application/student-absences.service';
import { ReportAbsenceDto } from '../dto/report-absence.dto';
import { StudentAbsenceResponseDto } from '../dto/student-absence-response.dto';

@ApiTags('Student Absences')
@Controller('student-absences')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
export class StudentAbsenceController {
  constructor(private readonly service: StudentAbsencesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.GUARDIAN)
  @ApiOperation({
    summary: "Report that the caller's child won't ride the route on a date",
    description:
      "Re-plans that day's route without the student (per leg). Reporting the same day " +
      'again widens the existing absence. Allowed until the school entry time (ida) / ' +
      "exit time (regreso) in the company's timezone.",
  })
  @ApiCreatedResponse({ type: StudentAbsenceResponseDto })
  @ApiBadRequestResponse({
    description:
      'Past date, past the cutoff, or a leg the student does not ride',
  })
  @ApiForbiddenResponse({ description: 'Not a guardian of this student' })
  async report(
    @Body() dto: ReportAbsenceDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<StudentAbsenceResponseDto> {
    return this.service.report(currentUser.sub, dto);
  }

  @Get('me')
  @Roles(UserRole.GUARDIAN)
  @ApiOperation({ summary: "Upcoming absences of the caller's children" })
  @ApiOkResponse({ type: [StudentAbsenceResponseDto] })
  async findMine(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<StudentAbsenceResponseDto[]> {
    return this.service.findMine(currentUser.sub);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.GUARDIAN)
  @ApiOperation({
    summary: 'Cancel a reported absence (the student will ride after all)',
  })
  @ApiOkResponse({ type: StudentAbsenceResponseDto })
  @ApiBadRequestResponse({ description: 'Past the cutoff' })
  @ApiForbiddenResponse({ description: 'Not a guardian of this student' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<StudentAbsenceResponseDto> {
    return this.service.cancel(currentUser.sub, id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: "A company's active absences",
    description:
      'For one date when `date` is sent, otherwise from today onward.',
  })
  @ApiQuery({ name: 'date', required: false, example: '2026-11-25' })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  @ApiOkResponse({ type: [StudentAbsenceResponseDto] })
  async findForCompany(
    @CurrentUser() currentUser: JwtPayload,
    @Query('date') date?: string,
    @Query('studentId') studentId?: string,
    @Query('companyId') companyId?: string,
  ): Promise<StudentAbsenceResponseDto[]> {
    const scopedCompanyId =
      currentUser.role === UserRole.SUPER_ADMIN
        ? companyId
        : currentUser.companyId;
    if (!scopedCompanyId) {
      throw new BadRequestException('companyId is required');
    }
    return this.service.findForCompany(scopedCompanyId, { date, studentId });
  }
}
