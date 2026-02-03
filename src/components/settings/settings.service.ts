import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SchoolsService } from '../schools/schools.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SchoolConfigDto, UpdateSchoolConfigDto } from './dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly prisma: PrismaService,
  ) {}

  async getSchoolConfig(userId: string): Promise<SchoolConfigDto> {
    // Get user's school
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { school: true },
    });

    if (!user?.school) {
      throw new NotFoundException('School not found for user');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: user.school.id },
      include: {
        primaryAddress: true,
        addresses: {
          include: {
            address: true,
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get the primary address or first address
    const primaryAddress = school.primaryAddress || school.addresses[0]?.address;

    return {
      schoolName: school.name,
      schoolCode: school.code,
      logoUrl: school.logoUrl,
      motto: school.motto || '',
      principalName: school.principalName || '',
      principalEmail: school.principalEmail || '',
      establishedYear: school.establishedYear || '',
      schoolType: school.schoolType || '',
      accreditation: school.accreditation || '',
      studentCapacity: school.studentCapacity || '',
      description: school.description || '',
      colorScheme: school.colorScheme || 'default',
      schoolAddress: primaryAddress ? {
        street: primaryAddress.street1,
        street2: primaryAddress.street2,
        city: primaryAddress.city,
        state: primaryAddress.state,
        country: primaryAddress.country,
        postalCode: primaryAddress.zip,
      } : null,
      contactInfo: {
        phone: school.phone || '',
        email: school.email || '',
        website: school.website || '',
      },
      academicSettings: {
        gradingSystem: 'PERCENTAGE', // Default values
        passMark: 50,
        maxScore: 100,
        attendanceThreshold: 75,
      },
      systemSettings: {
        timezone: 'Africa/Lagos',
        dateFormat: 'DD/MM/YYYY',
        currency: 'NGN',
        language: 'en',
      },
    };
  }

  async updateSchoolConfig(userId: string, updateData: UpdateSchoolConfigDto): Promise<{ updatedFields: string[]; updatedAt: Date }> {
    // Get user's school
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { school: true },
    });

    if (!user?.school) {
      throw new NotFoundException('School not found for user');
    }

    const updatedFields: string[] = [];
    const updatePayload: any = {};

    // Update basic school info
    if (updateData.schoolName) {
      updatePayload.name = updateData.schoolName;
      updatedFields.push('schoolName');
    }

    if (updateData.logoUrl) {
      updatePayload.logoUrl = updateData.logoUrl;
      updatedFields.push('logoUrl');
    }

    // Handle school profile updates
    if (updateData.motto !== undefined) {
      updatePayload.motto = updateData.motto;
      updatedFields.push('motto');
    }
    if (updateData.principalName !== undefined) {
      updatePayload.principalName = updateData.principalName;
      updatedFields.push('principalName');
    }
    if (updateData.principalEmail !== undefined) {
      updatePayload.principalEmail = updateData.principalEmail;
      updatedFields.push('principalEmail');
    }
    if (updateData.establishedYear !== undefined) {
      updatePayload.establishedYear = updateData.establishedYear;
      updatedFields.push('establishedYear');
    }
    if (updateData.schoolType !== undefined) {
      updatePayload.schoolType = updateData.schoolType;
      updatedFields.push('schoolType');
    }
    if (updateData.accreditation !== undefined) {
      updatePayload.accreditation = updateData.accreditation;
      updatedFields.push('accreditation');
    }
    if (updateData.studentCapacity !== undefined) {
      updatePayload.studentCapacity = updateData.studentCapacity;
      updatedFields.push('studentCapacity');
    }
    if (updateData.description !== undefined) {
      updatePayload.description = updateData.description;
      updatedFields.push('description');
    }
    if (updateData.colorScheme !== undefined) {
      updatePayload.colorScheme = updateData.colorScheme;
      updatedFields.push('colorScheme');
    }

    // Handle contact info updates
    if (updateData.contactInfo) {
      if (updateData.contactInfo.phone !== undefined) {
        updatePayload.phone = updateData.contactInfo.phone;
        updatedFields.push('contactInfo.phone');
      }
      if (updateData.contactInfo.email !== undefined) {
        updatePayload.email = updateData.contactInfo.email;
        updatedFields.push('contactInfo.email');
      }
      if (updateData.contactInfo.website !== undefined) {
        updatePayload.website = updateData.contactInfo.website;
        updatedFields.push('contactInfo.website');
      }
    }

    // Update school record
    if (Object.keys(updatePayload).length > 0) {
      await this.prisma.school.update({
        where: { id: user.school.id },
        data: updatePayload,
      });
    }

    // Handle address updates
    if (updateData.schoolAddress) {
      const school = await this.prisma.school.findUnique({
        where: { id: user.school.id },
        include: { primaryAddress: true },
      });

      if (school?.primaryAddress) {
        // Update existing primary address
        await this.prisma.address.update({
          where: { id: school.primaryAddress.id },
          data: {
            street1: updateData.schoolAddress.street,
            street2: updateData.schoolAddress.street2,
            city: updateData.schoolAddress.city,
            state: updateData.schoolAddress.state,
            country: updateData.schoolAddress.country,
            zip: updateData.schoolAddress.postalCode,
          },
        });
        updatedFields.push('schoolAddress');
      } else {
        // Create new primary address
        const newAddress = await this.prisma.address.create({
          data: {
            street1: updateData.schoolAddress.street,
            street2: updateData.schoolAddress.street2,
            city: updateData.schoolAddress.city,
            state: updateData.schoolAddress.state,
            country: updateData.schoolAddress.country,
            zip: updateData.schoolAddress.postalCode,
          },
        });

        // Update school to use this as primary address
        await this.prisma.school.update({
          where: { id: user.school.id },
          data: { primaryAddressId: newAddress.id },
        });
        updatedFields.push('schoolAddress');
      }
    }

    return {
      updatedFields,
      updatedAt: new Date(),
    };
  }

  async getGradingModel(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new NotFoundException('School not found for user');
    }

    const gradingModel = await this.prisma.gradingModel.findUnique({
      where: { schoolId: user.schoolId },
    });

    if (!gradingModel) {
      // Return default grading model
      return {
        id: null,
        schoolId: user.schoolId,
        model: {
          A: [70, 100],
          B: [60, 69],
          C: [50, 59],
          D: [45, 49],
          E: [40, 44],
          F: [0, 39],
        },
      };
    }

    return gradingModel;
  }

  async upsertGradingModel(userId: string, model: Record<string, [number, number]>) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new NotFoundException('School not found for user');
    }

    // Validate the grading model
    this.validateGradingModel(model);

    const result = await this.prisma.gradingModel.upsert({
      where: { schoolId: user.schoolId },
      update: { model: model as any },
      create: {
        schoolId: user.schoolId,
        model: model as any,
      },
    });

    return result;
  }

  private validateGradingModel(model: Record<string, [number, number]>) {
    const entries = Object.entries(model);

    if (entries.length === 0) {
      throw new BadRequestException('Grading model must have at least one grade');
    }

    // Validate each entry has [min, max] with min <= max
    for (const [grade, range] of entries) {
      if (!Array.isArray(range) || range.length !== 2) {
        throw new BadRequestException(`Grade "${grade}" must have a [min, max] range`);
      }
      const [min, max] = range;
      if (typeof min !== 'number' || typeof max !== 'number') {
        throw new BadRequestException(`Grade "${grade}" range must be numeric`);
      }
      if (min > max) {
        throw new BadRequestException(`Grade "${grade}" min (${min}) cannot be greater than max (${max})`);
      }
      if (min < 0 || max > 100) {
        throw new BadRequestException(`Grade "${grade}" range must be between 0 and 100`);
      }
    }

    // Validate no overlapping ranges
    const sortedEntries = entries.sort((a, b) => a[1][0] - b[1][0]);
    for (let i = 1; i < sortedEntries.length; i++) {
      const prevMax = sortedEntries[i - 1][1][1];
      const currMin = sortedEntries[i][1][0];
      if (currMin <= prevMax) {
        throw new BadRequestException(
          `Overlapping ranges: "${sortedEntries[i - 1][0]}" (max ${prevMax}) and "${sortedEntries[i][0]}" (min ${currMin})`,
        );
      }
    }

    // Validate coverage: ranges should cover 0-100
    const lowestMin = sortedEntries[0][1][0];
    const highestMax = sortedEntries[sortedEntries.length - 1][1][1];
    if (lowestMin !== 0) {
      throw new BadRequestException(`Grading model must cover from 0. Lowest min is ${lowestMin}`);
    }
    if (highestMax !== 100) {
      throw new BadRequestException(`Grading model must cover up to 100. Highest max is ${highestMax}`);
    }
  }
}
