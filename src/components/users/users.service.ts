import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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

  async save(createUserDto: CreateUserDto, tx?: Prisma.TransactionClient) {
    const { password, email, dateOfBirth, ...others } = createUserDto;
    const hashedPassword = await this.hasher.hash(password);
    const dateOfBirthDate = dateOfBirth ? new Date(dateOfBirth) : undefined;

    const data = {
      ...others,
      email,
      password: hashedPassword,
      dateOfBirth: dateOfBirthDate,
    };

    // When a Prisma transaction client is supplied (e.g. from the bulk-import
    // processor) we write through it so the create is rolled back if any
    // sibling row in the same job fails. Otherwise we go through the repo
    // and inherit its ambient client behavior.
    if (tx) {
      return tx.user.create({ data });
    }
    return this.userRepository.create(data);
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
