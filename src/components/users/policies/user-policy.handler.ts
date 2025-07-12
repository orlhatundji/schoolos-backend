import { AppAbility, Action, DataSubject, IPolicyHandler } from '../../roles-manager';

export class ManageUserPolicyHandler implements IPolicyHandler {
  handle(ability: AppAbility) {
    return ability.can(Action.Manage, DataSubject.USER);
  }
}

export class ReadUserPolicyHandler implements IPolicyHandler {
  handle(ability: AppAbility) {
    return ability.can(Action.Read, DataSubject.USER);
  }
}

export class UpdateUserPolicyHandler implements IPolicyHandler {
  handle(ability: AppAbility) {
    return ability.can(Action.Update, DataSubject.USER);
  }
}
