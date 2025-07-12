export class PasswordValidator {
  private static _minPasswordLength = 6;
  private static _maxPasswordLength = 40;

  private static _validationRegex =
    '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[ -/:-@[-' +
    '`{-~]).' +
    `{${this._minPasswordLength},${this._maxPasswordLength}}$`;

  public static ValidationRegex = new RegExp(this._validationRegex);

  public static ValidationErrorMessage = `
      Password must have  a minimum length of ${this._minPasswordLength}
      Password can have a maximum length of ${this._maxPasswordLength}
      Password must contain at least one lower case character
      Password must contain at least one upper case character
      Password must contain at least one number
      Password must contain at least one special character
  `;

  public static GetMinLength() {
    return this._minPasswordLength;
  }

  public static GetMaxLength() {
    return this._maxPasswordLength;
  }

  public static GetValidationRegexString() {
    return this._validationRegex;
  }
}
