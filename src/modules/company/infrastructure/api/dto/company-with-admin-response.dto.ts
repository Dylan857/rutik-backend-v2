import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../../../user/infrastructure/api/dto/user-response.dto';
import { CompanyResponseDto } from './company-response.dto';

export class CompanyWithAdminResponseDto {
  @ApiProperty({
    type: CompanyResponseDto,
    description: 'The newly created company',
  })
  company: CompanyResponseDto;

  @ApiProperty({
    type: UserResponseDto,
    description: 'The ADMIN user created automatically for this company',
  })
  adminUser: UserResponseDto;
}
