import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

// Sent as multipart/form-data alongside the receipt photo (field name
// "file") — these are the other form fields, not the file itself.
export class SubmitReceiptDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'PaymentAccount the guardian transferred to',
  })
  @IsUUID()
  @IsNotEmpty()
  paymentAccountId: string;

  @ApiProperty({ example: '000123456789' })
  @IsString()
  @IsNotEmpty()
  referenceNumber: string;
}
