import { Injectable, NotFoundException } from '@nestjs/common';
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
}
