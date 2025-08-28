import { Body, Controller, Delete, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../common/decorators';
import { StrategyEnum } from '../auth/strategies';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import { CheckPolicies, PoliciesGuard } from '../roles-manager';
import { ManageStudentPolicyHandler } from '../students/policies';
import { DepartmentsService } from './departments.service';
import {
  ArchiveDepartmentSwagger,
  CreateDepartmentSwagger,
  DeleteDepartmentSwagger,
  UnarchiveDepartmentSwagger,
  UpdateDepartmentSwagger,
} from './departments.swagger';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { ArchiveDepartmentResult } from './results/archive-department.result';
import { CreateDepartmentResult } from './results/create-department.result';
import { DeleteDepartmentResult } from './results/delete-department.result';
import { UnarchiveDepartmentResult } from './results/unarchive-department.result';
import { UpdateDepartmentResult } from './results/update-department.result';

@Controller('departments')
@ApiTags('Departments')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard, PoliciesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @CreateDepartmentSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async createDepartment(
    @GetCurrentUserId() userId: string,
    @Body() createDepartmentDto: CreateDepartmentDto,
  ) {
    const data = await this.departmentsService.createDepartment(userId, createDepartmentDto);
    return new CreateDepartmentResult(data);
  }

  @Put(':departmentId')
  @UpdateDepartmentSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async updateDepartment(
    @GetCurrentUserId() userId: string,
    @Param('departmentId') departmentId: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    const data = await this.departmentsService.updateDepartment(
      userId,
      departmentId,
      updateDepartmentDto,
    );
    return new UpdateDepartmentResult(data);
  }

  @Post(':departmentId/archive')
  @ArchiveDepartmentSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async archiveDepartment(
    @GetCurrentUserId() userId: string,
    @Param('departmentId') departmentId: string,
  ) {
    const data = await this.departmentsService.archiveDepartment(userId, departmentId);
    return new ArchiveDepartmentResult(data);
  }

  @Post(':departmentId/unarchive')
  @UnarchiveDepartmentSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async unarchiveDepartment(
    @GetCurrentUserId() userId: string,
    @Param('departmentId') departmentId: string,
  ) {
    const data = await this.departmentsService.unarchiveDepartment(userId, departmentId);
    return new UnarchiveDepartmentResult(data);
  }

  @Delete(':departmentId')
  @DeleteDepartmentSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async deleteDepartment(
    @GetCurrentUserId() userId: string,
    @Param('departmentId') departmentId: string,
  ) {
    const data = await this.departmentsService.deleteDepartment(userId, departmentId);
    return new DeleteDepartmentResult(data);
  }
}
