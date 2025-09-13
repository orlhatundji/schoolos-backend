import { PartialType } from '@nestjs/swagger';

import { CreateAssessmentStructureDto } from './create-assessment-structure.dto';

export class UpdateAssessmentStructureDto extends PartialType(CreateAssessmentStructureDto) {}
