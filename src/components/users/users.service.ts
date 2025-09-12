import { BadRequestException, Injectable } from '@nestjs/common';

import { BaseService } from '../../common/base-service';
import { PasswordHasher } from '../../utils/hasher';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserMessages } from './results';
import { User } from './types';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService extends BaseService {
  constructor(
    private readonly userRepository: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly prisma: PrismaService,
  ) {
    super(UsersService.name);
  }

  async create(createUserDto: CreateUserDto) {
    return this.save(createUserDto);
  }

  async save(createUserDto: CreateUserDto) {
    await this.throwIfUserExists(createUserDto);

    const { password, email, dateOfBirth, ...others } = createUserDto;
    const hashedPassword = await this.hasher.hash(password);

    // Convert dateOfBirth string to Date object if provided
    const dateOfBirthDate = dateOfBirth ? new Date(dateOfBirth) : undefined;

    const createdUser = await this.userRepository.create({
      ...others,
      email,
      password: hashedPassword,
      dateOfBirth: dateOfBirthDate,
    });
    return createdUser;
  }

  private async throwIfUserExists(createUserDto: CreateUserDto) {
    const { email, phone } = createUserDto;

    let whereClause = {};
    if (email || phone) {
      whereClause = {
        OR: [email ? { email } : undefined, phone ? { phone } : undefined].filter(Boolean),
      };

      const existingUser = await this.userRepository.findOne({
        where: whereClause,
      });

      if (existingUser) {
        throw new BadRequestException(UserMessages.FAILURE.USER_EXISTS);
      }
    }
  }

  async findByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email },
      include: { school: true },
    });
  }

  findById(id: string) {
    return this.userRepository.findById(id);
  }

  async update(id: string, updateObj: UpdateUserDto) {
    // Check if user exists
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    // Check for email/phone conflicts if updating those fields
    if (updateObj.email || updateObj.phone) {
      const whereClause = {
        OR: [
          updateObj.email ? { email: updateObj.email } : undefined,
          updateObj.phone ? { phone: updateObj.phone } : undefined,
        ].filter(Boolean),
        id: { not: id }, // Exclude current user
        schoolId: existingUser.schoolId, // Same school scope
      };

      const conflictingUser = await this.userRepository.findOne({ where: whereClause });
      if (conflictingUser) {
        throw new BadRequestException('Email or phone number already exists in this school');
      }
    }

    // Hash password if provided
    const updateData: any = { ...updateObj };

    if (updateObj.password) {
      updateData.password = await this.hasher.hash(updateObj.password);
    }

    // Convert dateOfBirth string to Date if provided
    if (updateObj.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateObj.dateOfBirth);
    }

    return this.userRepository.update({ id }, updateData);
  }

  async updateLastLoginAt(id: string) {
    return this.userRepository.update(
      { id },
      {
        lastLoginAt: new Date(),
      },
    );
  }

  async remove(id: string) {
    return this.userRepository.delete({ id });
  }

  async updateByStudentId(studentId: string, updateObj: UpdateUserDto) {
    // First, find the student to get the userId
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true },
    });

    if (!student) {
      throw new BadRequestException('Student not found');
    }

    // Now update the user using the userId
    return this.update(student.userId, updateObj);
  }
}
