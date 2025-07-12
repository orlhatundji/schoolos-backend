import { ApiProperty } from '@nestjs/swagger';
import { BaseResultWithData, ResultOptions } from '../../../common/results';
import { User } from '../types';
import { UserType } from '@prisma/client';

export class UserEntity implements Omit<User, 'password'> {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: UserType;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  phoneVerified: boolean;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty()
  mustUpdatePassword: boolean;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  schoolId: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  avatarUrl: string;

  @ApiProperty()
  dateOfBirth: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  deletedAt: Date | null;

  public static from(user: User): UserEntity {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...filteredUser } = user;
    return filteredUser;
  }
}

export class UserResult extends BaseResultWithData<UserEntity> {
  @ApiProperty({ type: () => UserEntity })
  public data: UserEntity;

  public static from(user: User, options: ResultOptions): UserResult {
    const filteredUser = UserEntity.from(user);

    const result = new UserResult(options.status, options.message, filteredUser);
    return result;
  }
}
