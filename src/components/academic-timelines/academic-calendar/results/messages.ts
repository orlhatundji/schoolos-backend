export const AcademicCalendarMessages = {
  SUCCESS: {
    EVENT_CREATED_SUCCESSFULLY: 'Calendar event created successfully',
    EVENT_UPDATED_SUCCESSFULLY: 'Calendar event updated successfully',
    EVENT_DELETED_SUCCESSFULLY: 'Calendar event deleted successfully',
    EVENT_FETCHED_SUCCESSFULLY: 'Calendar event fetched successfully',
    EVENTS_FETCHED_SUCCESSFULLY: 'Calendar events fetched successfully',
    CALENDAR_FETCHED_SUCCESSFULLY: 'Academic calendar fetched successfully',
  },
  FAILURE: {
    EVENT_NOT_FOUND: 'Calendar event not found',
    ACADEMIC_SESSION_NOT_FOUND: 'Academic session not found',
    USER_NOT_ASSOCIATED_WITH_SCHOOL: 'User is not associated with any school',
    INVALID_DATE_RANGE: 'Invalid date range provided',
    UNAUTHORIZED_ACCESS: 'Unauthorized access to calendar event',
  },
} as const;
