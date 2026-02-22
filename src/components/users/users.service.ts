import { BadRequestException, Injectable } from '@nestjs/common';

import { BaseService } from '../../common/base-service';
import { PasswordHasher } from '../../utils/hasher';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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

  async findByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email },
      include: { school: true },
    });
  }

  findById(id: string) {
    return this.userRepository.findById(id);
  }

  async save(createUserDto: CreateUserDto) {
    const { password, email, dateOfBirth, ...others } = createUserDto;
    const hashedPassword = await this.hasher.hash(password);
    const dateOfBirthDate = dateOfBirth ? new Date(dateOfBirth) : undefined;

    const createdUser = await this.userRepository.create({
      ...others,
      email,
      password: hashedPassword,
      dateOfBirth: dateOfBirthDate,
    });

    return createdUser;
  }

  async update(id: string, updateObj: UpdateUserDto) {
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
