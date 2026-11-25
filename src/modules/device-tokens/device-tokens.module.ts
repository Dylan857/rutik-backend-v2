import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceToken } from './domain/device-token.entity';
import { DEVICE_TOKEN_REPOSITORY } from './domain/interfaces/device-token.repository';
import { DeviceTokenRepositoryImpl } from './infrastructure/repositories/device-token.repository.impl';
import { DeviceTokensService } from './application/device-tokens.service';
import { DeviceTokenController } from './infrastructure/api/controllers/device-token.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceToken])],
  controllers: [DeviceTokenController],
  providers: [
    DeviceTokensService,
    {
      provide: DEVICE_TOKEN_REPOSITORY,
      useClass: DeviceTokenRepositoryImpl,
    },
  ],
  exports: [DeviceTokensService],
})
export class DeviceTokensModule {}
