import { Controller, Post, Body, Get, Param, Put, Delete, Query, HttpStatus } from '@nestjs/common';
import { AssessmentStructureService } from './assessment-structure.service';
import {
  AssessmentStructureResult,
  ManyAssessmentStructuresResult,
} from './results/assessment-structure-result';
import { AssessmentStructureMessages } from './results/messages';
import { CreateAssessmentStructureDto } from './dto/create-assessment-structure.dto';

@Controller('assessment-structures')
export class AssessmentStructureController {
  constructor(private readonly service: AssessmentStructureService) {}

  @Post()
  async create(@Body() dto: CreateAssessmentStructureDto) {
    const structure = await this.service.createStructure(
      dto.schoolId,
      dto.academicSessionId,
      dto.name,
      dto.components,
    );
    return AssessmentStructureResult.from(structure, {
      status: HttpStatus.CREATED,
      message: AssessmentStructureMessages.SUCCESS.STRUCTURE_CREATED_SUCCESSFULLY,
    });
  }

  @Get()
  async findAll(
    @Query('schoolId') schoolId: string,
    @Query('academicSessionId') academicSessionId?: string,
  ) {
    const structures = await this.service.getStructures(schoolId, academicSessionId);
    return ManyAssessmentStructuresResult.from(structures, {
      status: HttpStatus.OK,
      message: AssessmentStructureMessages.SUCCESS.STRUCTURE_FETCHED_SUCCESSFULLY,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const structure = await this.service.getStructureById(id);
    return AssessmentStructureResult.from(structure, {
      status: HttpStatus.OK,
      message: AssessmentStructureMessages.SUCCESS.STRUCTURE_FETCHED_SUCCESSFULLY,
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: { name: string; components: { name: string; weight: number }[] },
  ) {
    const structure = await this.service.updateStructure(id, dto.name, dto.components);
    return AssessmentStructureResult.from(structure, {
      status: HttpStatus.OK,
      message: AssessmentStructureMessages.SUCCESS.STRUCTURE_UPDATED_SUCCESSFULLY,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const structure = await this.service.deleteStructure(id);
    return AssessmentStructureResult.from(structure, {
      status: HttpStatus.OK,
      message: AssessmentStructureMessages.SUCCESS.STRUCTURE_DELETED_SUCCESSFULLY,
    });
  }
}
