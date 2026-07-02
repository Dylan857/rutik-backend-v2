import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { Company } from './domain/company.entity';
import { COMPANY_REPOSITORY } from './domain/interfaces/company.repository';
import { CompanyRepositoryImpl } from './infrastructure/repositories/company.repository.impl';
import { CompanyService } from './application/company.service';
import { CompanyController } from './infrastructure/api/controllers/company.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Company]), UserModule],
  controllers: [CompanyController],
  providers: [
    CompanyService,
    {
      provide: COMPANY_REPOSITORY,
      useClass: CompanyRepositoryImpl,
    },
  ],
  exports: [CompanyService],
})
export class CompanyModule {}
