import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { AssessmentStructureRepository } from './assessment-structure.repository';
import { AssessmentComponentRepository } from './assessment-component.repository';
import { AssessmentStructureMessages } from './results/messages';

@Injectable()
export class AssessmentStructureService {
  constructor(
    private readonly structureRepo: AssessmentStructureRepository,
    private readonly componentRepo: AssessmentComponentRepository,
  ) {}

  async createStructure(
    schoolId: string,
    academicSessionId: string,
    name: string,
    components: { name: string; weight: number }[] = [],
  ): Promise<any> {
    if (!components || components.length === 0) {
      components = [
        { name: 'Test 1', weight: 20 },
        { name: 'Test 2', weight: 20 },
        { name: 'Exam', weight: 60 },
      ];
    }
    const total = components.reduce((sum, c) => sum + c.weight, 0);
    if (total !== 100) {
      throw new BadRequestException(AssessmentStructureMessages.FAILURE.INVALID_TOTAL);
    }
    return this.structureRepo.create(
      {
        schoolId,
        academicSessionId,
        name,
        components: {
          create: components,
        },
      },
      { include: { components: true } },
    );
  }

  async getOrCreateForSession(schoolId: string, academicSessionId: string): Promise<any> {
    const structure = await this.structureRepo.findOne({
      where: { schoolId, academicSessionId },
      include: { components: true },
    });
    if (structure) return structure;
    // Fetch the latest previous structure for this school
    const prevList = await this.structureRepo.findAll({
      where: { schoolId },
      include: { components: true },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    const prev = prevList[0] as any;

    if (prev && prev.components && prev.components.length > 0) {
      return this.createStructure(
        schoolId,
        academicSessionId,
        prev.name,
        prev.components.map((c: any) => ({ name: c.name, weight: c.weight })),
      );
    }
    return this.createStructure(schoolId, academicSessionId, 'Default Structure');
  }

  async getStructures(schoolId: string, academicSessionId?: string) {
    return this.structureRepo.findAll({
      where: { schoolId, ...(academicSessionId ? { academicSessionId } : {}) },
      include: { components: true },
    });
  }

  async getStructureById(id: string) {
    const structure = await this.structureRepo.findById(id, { include: { components: true } });
    if (!structure)
      throw new NotFoundException(AssessmentStructureMessages.FAILURE.STRUCTURE_NOT_FOUND);
    return structure;
  }

  async updateStructure(id: string, name: string, components: { name: string; weight: number }[]) {
    const total = components.reduce((sum, c) => sum + c.weight, 0);
    if (total !== 100) {
      throw new BadRequestException('Assessment weights must sum to 100');
    }
    await this.componentRepo.delete({ assessmentStructureId: id } as any); // deleteMany not in base, fallback to delete hack
    return this.structureRepo.update(
      { id },
      {
        name,
        components: {
          create: components,
        },
      },
    );
  }

  async deleteStructure(id: string) {
    await this.componentRepo.delete({ assessmentStructureId: id } as any); // deleteMany not in base, fallback to delete hack
    return this.structureRepo.delete({ id });
  }
}
