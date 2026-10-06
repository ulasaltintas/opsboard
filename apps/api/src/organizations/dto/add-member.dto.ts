import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';
import { OrganizationRole } from '../../../generated/prisma/enums';

export class AddMemberDto {
  @ApiProperty({
    example: 'member@example.com',
    description: 'Email address of the user to add to the organization',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    enum: OrganizationRole,
    example: OrganizationRole.MEMBER,
    description: 'Role assigned to the user inside the organization',
  })
  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}
