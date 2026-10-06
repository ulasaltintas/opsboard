import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrganizationRole } from '../../../generated/prisma/enums';

export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: OrganizationRole,
    example: OrganizationRole.ADMIN,
  })
  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}
