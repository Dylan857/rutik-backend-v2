import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DriverService } from '../../drivers/application/drivers.service';
import { GuardianService } from '../../guardians/application/guardians.service';
import { UserService } from '../../user/application/user.service';
import { UserRole } from '../../user/domain/enums/user-role.enum';
import {
  ChangePasswordDto,
  ProfileResponseDto,
  UpdateProfileDto,
} from '../infrastructure/api/dto/profile.dto';

/**
 * The signed-in user's own profile (parents' and drivers' mobile app).
 * Guardians keep a copy of their name/phone on the Guardian record that the
 * admin panel shows, so edits are mirrored there.
 */
@Injectable()
export class ProfileService {
  constructor(
    private readonly userService: UserService,
    private readonly guardianService: GuardianService,
    private readonly driverService: DriverService,
  ) {}

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.userService.findById(userId);
    const driver =
      user.role === UserRole.DRIVER
        ? await this.driverService.findByUserId(userId)
        : null;

    return {
      id: user.id,
      role: user.role,
      companyId: user.companyId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      document: user.document,
      phone: user.phone,
      driver: driver
        ? {
            driverId: driver.id,
            licenseNumber: driver.licenseNumber,
            licenseCategory: driver.licenseCategory,
            licenseExpirationDate: driver.licenseExpirationDate,
            hireDate: driver.hireDate,
          }
        : null,
    };
  }

  async updateProfile(
    actor: { userId: string; email: string },
    dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const changes = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    };

    const user = await this.userService.update(actor.userId, changes, actor, {
      audit: false,
    });

    if (user.role === UserRole.GUARDIAN) {
      const guardian = await this.guardianService.findByUserId(actor.userId);
      if (guardian) {
        await this.guardianService.update(guardian.id, changes, actor);
      }
    }

    return this.getProfile(actor.userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userService.findById(userId);

    const matches = await bcrypt.compare(dto.currentPassword, user.password);
    if (!matches) {
      throw new BadRequestException('La contraseña actual no es correcta.');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual.',
      );
    }

    await this.userService.updatePassword(userId, dto.newPassword);
  }
}
