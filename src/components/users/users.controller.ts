import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBadRequestResponse, ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserMessages, UserResult } from './results';
import { CheckPolicies, PoliciesGuard } from '../roles-manager';
import { ManageUserPolicyHandler } from './policies';
import { StrategyEnum } from '../auth/strategies';

@Controller('users')
@ApiTags('User')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(PoliciesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: UserResult,
    description: UserMessages.SUCCESS.USER_CREATED_SUCCESSFULLY,
  })
  @ApiBadRequestResponse({
    description: UserMessages.FAILURE.USER_EXISTS,
  })
  @CheckPolicies(new ManageUserPolicyHandler())
  async create(@Body() createUserDto: CreateUserDto) {
    const createdUser = await this.usersService.create(createUserDto);

    return UserResult.from(createdUser, {
      status: HttpStatus.CREATED,
      message: UserMessages.SUCCESS.USER_CREATED_SUCCESSFULLY,
    });
  }

  @Get()
  findAll() {
    return [];
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
