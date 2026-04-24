import { Controller, Delete, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

import { StrategyEnum } from '../auth/strategies';
import { CheckPolicies, PoliciesGuard } from '../roles-manager';
import { ManageStudentPolicyHandler } from './policies';
import { ClassArmStudentService } from './services/class-arm-student.service';

@Controller('class-arms')
@ApiTags('Class Arms')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(PoliciesGuard)
export class ClassArmStudentsController {
  constructor(private readonly classArmStudentService: ClassArmStudentService) {}

  @Delete(':classArmId/students/:studentId')
  @CheckPolicies(new ManageStudentPolicyHandler())
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student removed from class',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No active enrollment found',
  })
  async removeStudentFromClassArm(
    @Param('classArmId') classArmId: string,
    @Param('studentId') studentId: string,
  ) {
    const data = await this.classArmStudentService.removeStudentFromClassArm(studentId, classArmId);
    return { success: true, id: data.id, leftAt: data.leftAt };
  }
}
