export const ResetPasswordMessages = {
  SUCCESS: {
    TOKEN_CONFIRMED: 'Token confirmed',
    TOKEN_STATUS_FETCHED: 'Token status successfully fetched',
    PASSWORD_UPDATED: 'Password updated',
    SENT_RESET_PASSWORD_LINK:
      'We have sent a reset password link to your email if an account exists with us',
    PASSWORD_RESET_FOR_USER:
      'Password reset successfully. User must update password on next login.',
  },
  FAILURE: {
    RESET_LINK_EXPIRED: 'Reset link expired',
    INVALID_TOKEN: 'Invalid token',
    USER_NOT_FOUND: 'User not found',
    RESET_PASSWORD_NOT_CONFIRMED: 'Reset token not confirmed',
  },
  INFO: {},
};
