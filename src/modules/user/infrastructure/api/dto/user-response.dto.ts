import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { UserRole } from '../../../domain/enums/user-role.enum';
import { UserStatus } from '../../../domain/enums/user-status.enum';

export class UserResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  companyId: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN })
  @Expose()
  role: UserRole;

  @ApiProperty({ example: 'Juan' })
  @Expose()
  firstName: string;

  @ApiProperty({ example: 'Pérez' })
  @Expose()
  lastName: string;

  @ApiProperty({ example: '1234567890' })
  @Expose()
  document: string;

  @ApiProperty({ example: 'juan.perez@empresa.com' })
  @Expose()
  email: string;

  @ApiPropertyOptional({ example: '+57 320 123 4567', nullable: true })
  @Expose()
  phone: string | null;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  @Expose()
  status: UserStatus;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  lastLoginAt: Date | null;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}
