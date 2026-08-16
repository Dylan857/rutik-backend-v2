import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { School } from './domain/school.entity';
import { SCHOOL_REPOSITORY } from './domain/interfaces/school.repository';
import { SchoolRepositoryImpl } from './infrastructure/repositories/school.repository.impl';
import { SchoolService } from './application/school.service';
import { SchoolController } from './infrastructure/api/controllers/school.controller';

@Module({
  imports: [TypeOrmModule.forFeature([School]), CompanyModule, AuditLogsModule],
  controllers: [SchoolController],
  providers: [
    SchoolService,
    {
      provide: SCHOOL_REPOSITORY,
      useClass: SchoolRepositoryImpl,
    },
  ],
  exports: [SchoolService],
})
export class SchoolModule {}
