import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    example: 'Acme GmbH',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'acme-gmbh',
    description: 'Unique URL-friendly organization identifier',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug!: string;
}
