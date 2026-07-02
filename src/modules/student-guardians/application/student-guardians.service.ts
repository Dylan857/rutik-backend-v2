import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StudentService } from '../../students/application/students.service';
import { GuardianService } from '../../guardians/application/guardians.service';
import { StudentGuardian } from '../domain/student-guardian.entity';
import {
  IStudentGuardianRepository,
  StudentGuardianFilters,
  STUDENT_GUARDIAN_REPOSITORY,
} from '../domain/interfaces/student-guardian.repository';
import { CreateStudentGuardianDto } from '../infrastructure/api/dto/create-student-guardian.dto';
import { UpdateStudentGuardianDto } from '../infrastructure/api/dto/update-student-guardian.dto';

@Injectable()
export class StudentGuardianService {
  constructor(
    @Inject(STUDENT_GUARDIAN_REPOSITORY)
    private readonly studentGuardianRepository: IStudentGuardianRepository,
    private readonly studentService: StudentService,
    private readonly guardianService: GuardianService,
  ) {}

  async create(dto: CreateStudentGuardianDto): Promise<StudentGuardian> {
    const student = await this.studentService.findById(dto.studentId);
    const guardian = await this.guardianService.findById(dto.guardianId);

    if (student.companyId !== guardian.companyId) {
      throw new BadRequestException(
        `Student "${dto.studentId}" and guardian "${dto.guardianId}" do not belong to the same company`,
      );
    }

    const existing =
      await this.studentGuardianRepository.findByStudentAndGuardian(
        dto.studentId,
        dto.guardianId,
      );
    if (existing) {
      throw new ConflictException(
        `A relationship between student "${dto.studentId}" and guardian "${dto.guardianId}" already exists`,
      );
    }

    if (dto.isPrimary) {
      await this.studentGuardianRepository.clearPrimaryForStudent(
        dto.studentId,
      );
    }

    return this.studentGuardianRepository.create(dto);
  }

  async findAll(filters: StudentGuardianFilters): Promise<StudentGuardian[]> {
    return this.studentGuardianRepository.findAll(filters);
  }

  async findById(id: string): Promise<StudentGuardian> {
    const relation = await this.studentGuardianRepository.findById(id);

    if (!relation) {
      throw new NotFoundException(`StudentGuardian with ID "${id}" not found`);
    }

    return relation;
  }

  async update(
    id: string,
    dto: UpdateStudentGuardianDto,
  ): Promise<StudentGuardian> {
    const current = await this.findById(id);

    if (dto.isPrimary === true) {
      // Demote any other primary guardian for this student before promoting this one.
      await this.studentGuardianRepository.clearPrimaryForStudent(
        current.studentId,
        id,
      );
    }

    return this.studentGuardianRepository.update(id, dto);
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.studentGuardianRepository.softDelete(id);
  }
}
