import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Delete } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
//import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiConflictResponse,
  //ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiOkResponse({ description: 'Users returned successfully' })
  findAll() {
    return this.usersService.findAll();
  }
  /*
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiCreatedResponse({ description: 'User created successfully' })
  @ApiConflictResponse({ description: 'User already exists' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  } */

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiOkResponse({ description: 'User returned successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiNoContentResponse({ description: 'User deleted successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiOkResponse({ description: 'User updated successfully' })
  @ApiNotFoundResponse({ description: 'User was not found' })
  @ApiConflictResponse({ description: 'Email already exists' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  removeId(@Param('id') id: string) {
    return this.usersService.removeId(id);
  }
}
