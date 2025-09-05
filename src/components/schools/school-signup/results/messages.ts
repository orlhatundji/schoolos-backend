export const SchoolSignupMessages = {
  SUCCESS: {
    SIGNUP_REQUEST_CREATED: 'School signup request created successfully',
    SIGNUP_REQUEST_RETRIEVED: 'School signup request retrieved successfully',
    SIGNUP_REQUEST_UPDATED: 'School signup request updated successfully',
    SIGNUP_REQUEST_APPROVED: 'School signup request approved successfully',
    SIGNUP_REQUEST_REJECTED: 'School signup request rejected successfully',
    SCHOOL_ACCOUNT_CREATED:
      'School account created successfully. Admin credentials sent to the contact person.',
  },
  FAILURE: {
    SCHOOL_CODE_EXISTS: 'School code already exists',
    SIGNUP_REQUEST_NOT_FOUND: 'School signup request not found',
    INVALID_ACTION: 'Invalid action. Must be either approve or reject',
    REJECTION_REASON_REQUIRED: 'Rejection reason is required when rejecting a request',
    SCHOOL_CREATION_FAILED: 'Failed to create school account',
    ADMIN_CREATION_FAILED: 'Failed to create admin account',
  },
};
