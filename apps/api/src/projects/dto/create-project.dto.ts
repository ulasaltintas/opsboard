import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({
    example: 'Website Redesign',
    description: 'Name of the project',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: 'Redesign the company website',
    description: 'Optional project description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
