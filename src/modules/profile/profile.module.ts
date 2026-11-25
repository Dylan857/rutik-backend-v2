import { Module } from '@nestjs/common';
import { DriversModule } from '../drivers/drivers.module';
import { GuardiansModule } from '../guardians/guardians.module';
import { UserModule } from '../user/user.module';
import { ProfileService } from './application/profile.service';
import { ProfileController } from './infrastructure/api/controllers/profile.controller';

@Module({
  imports: [UserModule, GuardiansModule, DriversModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
