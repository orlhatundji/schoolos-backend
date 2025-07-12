import {
  createMongoAbility,
  AbilityBuilder,
  ExtractSubjectType,
  MongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { IRoleManager } from './role-manager.interface';
import { BaseService } from '../../common/base-service';
import { User } from '@prisma/client';
import { Action, DataSubject } from './types';
import { UserTypes } from '../users/constants';

export type CaslSubjects = keyof {
  [K in keyof typeof DataSubject as Lowercase<K>]: (typeof DataSubject)[K];
};

export type AppAbility = MongoAbility<[Action, CaslSubjects]>;

@Injectable()
export class RoleManagerFactory extends BaseService implements IRoleManager {
  constructor() {
    super(RoleManagerFactory.name);
  }

  async createUserPermissions(user: User) {
    const { can, build } = new AbilityBuilder(createMongoAbility);
    await this._setUserPermision(user, can);
    return build({
      // Read https://casl.js.org/v5/en/guide/subject-type-detection#use-classes-as-subject-types for details
      detectSubjectType: (item) => item.constructor as unknown as ExtractSubjectType<CaslSubjects>,
    });
  }

  private async _setUserPermision(user: User, can): Promise<void> {
    if (user.type === UserTypes.SUPER_ADMIN) {
      can(Action.Manage, DataSubject.ALL);
      return;
    }

    if (user.type === UserTypes.ADMIN) {
      can(Action.Manage, DataSubject.STUDENT);
      can(Action.Manage, DataSubject.TEACHER);
      can(Action.Manage, DataSubject.USER);
      return;
    }

    if (user.type === UserTypes.TEACHER) {
      can(Action.Read, DataSubject.STUDENT);
    }

    if (user.type === UserTypes.STUDENT) {
      can(Action.Update, DataSubject.STUDENT);
    }
  }
}
