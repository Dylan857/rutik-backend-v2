import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SummaryCardsDto {
  @ApiProperty({
    example: 128,
    description: 'Total students registered in the company',
  })
  @Expose()
  students: number;

  @ApiProperty({
    example: 6,
    description: 'Total schools registered in the company',
  })
  @Expose()
  schools: number;

  @ApiProperty({
    example: 12,
    description: 'Total vehicles registered in the company',
  })
  @Expose()
  vehicles: number;

  @ApiProperty({
    example: 9,
    description: 'Routes currently with ACTIVE status',
  })
  @Expose()
  activeRoutes: number;
}
