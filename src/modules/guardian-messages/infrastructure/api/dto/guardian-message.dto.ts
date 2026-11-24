import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  GuardianMessageCategory,
  GuardianMessageStatus,
  GuardianMessageTopic,
} from '../../../domain/enums/guardian-message.enums';

export class CreateGuardianMessageDto {
  @ApiProperty({
    enum: GuardianMessageCategory,
    description: 'CONCERN = inquietud, COMPLAINT = incomodidad',
  })
  @IsEnum(GuardianMessageCategory)
  category: GuardianMessageCategory;

  @ApiProperty({ enum: GuardianMessageTopic })
  @IsEnum(GuardianMessageTopic)
  topic: GuardianMessageTopic;

  @ApiProperty({ example: 'El bus llegó 20 minutos tarde esta mañana.' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({
    description: "Student the message is about (one of the caller's children)",
  })
  @IsUUID()
  @IsOptional()
  studentId?: string;
}

export class GuardianMessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: GuardianMessageCategory })
  category: GuardianMessageCategory;

  @ApiProperty({ enum: GuardianMessageTopic })
  topic: GuardianMessageTopic;

  @ApiProperty()
  message: string;

  @ApiProperty({ enum: GuardianMessageStatus })
  status: GuardianMessageStatus;

  @ApiProperty({ example: 'María López' })
  guardianName: string;

  @ApiProperty()
  guardianEmail: string;

  @ApiProperty({ nullable: true })
  guardianPhone: string | null;

  @ApiProperty({ nullable: true })
  studentId: string | null;

  @ApiProperty({ nullable: true, example: 'Sofía Gómez' })
  studentName: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  resolvedAt: Date | null;
}
