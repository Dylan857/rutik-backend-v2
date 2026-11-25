import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ProfileService } from './profile.service';
import { UserRole } from '../../user/domain/enums/user-role.enum';

function setup(role: UserRole, passwordHash = '') {
  const user = {
    id: 'user-1',
    role,
    companyId: 'company-1',
    firstName: 'María',
    lastName: 'López',
    email: 'maria@mail.com',
    document: '123',
    phone: '3000000000',
    password: passwordHash,
  };
  const userService = {
    findById: jest.fn().mockResolvedValue(user),
    update: jest.fn().mockResolvedValue(user),
    updatePassword: jest.fn().mockResolvedValue(undefined),
  };
  const guardianService = {
    findByUserId: jest.fn().mockResolvedValue({ id: 'guardian-1' }),
    update: jest.fn().mockResolvedValue({}),
  };
  const driverService = {
    findByUserId: jest.fn().mockResolvedValue({
      id: 'driver-1',
      licenseNumber: 'C-1',
      licenseCategory: 'C2',
      licenseExpirationDate: '2028-01-01',
      hireDate: '2024-01-01',
    }),
  };
  const service = new ProfileService(
    userService as never,
    guardianService as never,
    driverService as never,
  );
  return { service, userService, guardianService, driverService };
}

const actor = { userId: 'user-1', email: 'maria@mail.com' };

describe('ProfileService', () => {
  it("mirrors a guardian's name/phone onto their Guardian record", async () => {
    const { service, userService, guardianService } = setup(UserRole.GUARDIAN);
    await service.updateProfile(actor, { phone: '3111111111' });

    expect(userService.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ phone: '3111111111' }),
      actor,
      { audit: false },
    );
    expect(guardianService.update).toHaveBeenCalledWith(
      'guardian-1',
      expect.objectContaining({ phone: '3111111111' }),
      actor,
    );
  });

  it('does not touch Guardian records for a driver, and returns license info', async () => {
    const { service, guardianService } = setup(UserRole.DRIVER);
    const profile = await service.updateProfile(actor, { firstName: 'Carlos' });

    expect(guardianService.update).not.toHaveBeenCalled();
    expect(profile.driver).toEqual(
      expect.objectContaining({ licenseCategory: 'C2' }),
    );
  });

  it('changes the password when the current one matches', async () => {
    const hash = await bcrypt.hash('OldPass123', 4);
    const { service, userService } = setup(UserRole.GUARDIAN, hash);

    await service.changePassword('user-1', {
      currentPassword: 'OldPass123',
      newPassword: 'NewPass123',
    });
    expect(userService.updatePassword).toHaveBeenCalledWith(
      'user-1',
      'NewPass123',
    );
  });

  it('rejects a wrong current password', async () => {
    const hash = await bcrypt.hash('OldPass123', 4);
    const { service, userService } = setup(UserRole.GUARDIAN, hash);

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'nope',
        newPassword: 'NewPass123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(userService.updatePassword).not.toHaveBeenCalled();
  });
});
