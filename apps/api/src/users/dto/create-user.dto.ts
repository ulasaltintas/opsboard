import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Unique email address of the user',
    example: 'ulas@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    example: 'Ulas',
    description: 'Display name of the user',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;
}
