import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './application/user.service';
import { USER_REPOSITORY } from './domain/interfaces/user.repository';
import { User } from './domain/user.entity';
import { UserController } from './infrastructure/api/controllers/user.controller';
import { UserRepositoryImpl } from './infrastructure/repositories/user.repository.impl';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuditLogsModule],
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryImpl,
    },
  ],
  exports: [UserService],
})
export class UserModule {}
