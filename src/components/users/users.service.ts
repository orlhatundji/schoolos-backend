import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserMessages } from './results';
import { BaseService } from '../../common/base-service';
import { PasswordHasher } from '../../utils/hasher';
import { UsersRepository } from './users.repository';
import { User } from './types';

@Injectable()
export class UsersService extends BaseService {
  constructor(
    private readonly userRepository: UsersRepository,
    private readonly hasher: PasswordHasher,
  ) {
    super(UsersService.name);
  }

  async create(createUserDto: CreateUserDto) {
    return this.save(createUserDto);
  }

  async save(createUserDto: CreateUserDto) {
    await this.throwIfUserExists(createUserDto);

    const { password, email, ...others } = createUserDto;
    const hashedPassword = await this.hasher.hash(password);
    const createdUser = await this.userRepository.create({
      ...others,
      email,
      password: hashedPassword,
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
    return this.userRepository.findOne({ where: { email } });
  }

  findById(id: string) {
    return this.userRepository.findById(id);
  }

  update(
    id: string,
    updateObj: Partial<
      Pick<User, 'password' | 'firstName' | 'lastName' | 'email' | 'mustUpdatePassword'>
    >,
  ) {
    return this.userRepository.update(
      { id },
      {
        ...updateObj,
      },
    );
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
