import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferOwnershipDto {
  @ApiProperty({
    example: 'b96dfbad-d522-46e6-bbc6-e685ed77df98',
    description: 'User ID of the member who will become the new owner',
  })
  @IsUUID()
  userId!: string;
}
