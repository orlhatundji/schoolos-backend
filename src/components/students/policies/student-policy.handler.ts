import { AppAbility, Action, DataSubject, IPolicyHandler } from '../../roles-manager';

export class ManageStudentPolicyHandler implements IPolicyHandler {
  handle(ability: AppAbility) {
    return ability.can(Action.Manage, DataSubject.STUDENT);
  }
}

export class ReadStudentPolicyHandler implements IPolicyHandler {
  handle(ability: AppAbility) {
    return ability.can(Action.Read, DataSubject.STUDENT);
  }
}

export class UpdateStudentPolicyHandler implements IPolicyHandler {
  handle(ability: AppAbility) {
    return ability.can(Action.Update, DataSubject.STUDENT);
  }
}
