export const AssessmentStructureMessages = {
  SUCCESS: {
    CREATED: 'Assessment structure created successfully',
    FOUND: 'Assessment structures retrieved successfully',
    UPDATED: 'Assessment structure updated successfully',
    DELETED: 'Assessment structure deleted successfully',
  },
  ERROR: {
    NOT_FOUND: 'Assessment structure not found',
    ALREADY_EXISTS: 'Assessment structure with this name already exists',
    INVALID_TOTAL_SCORE: 'Total of all assessment structure maxScores cannot exceed 100',
    INVALID_SCORE_RANGE: 'maxScore must be between 1 and 100',
  },
} as const;
