/**
 * Default Assessment Structure Utility
 *
 * This utility provides a standardized assessment structure that all schools
 * should use by default. This ensures consistency across the platform.
 */

export interface DefaultAssessmentStructure {
  name: string;
  description: string;
  maxScore: number;
  isExam: boolean;
  order: number;
}

/**
 * Get the default assessment structure for any school
 * This structure totals 100% and follows the standard:
 * - Test 1: 20%
 * - Test 2: 20%
 * - Exam: 60%
 */
export function getDefaultAssessmentStructure(): DefaultAssessmentStructure[] {
  return [
    {
      name: 'Test 1',
      description: 'First continuous assessment test',
      maxScore: 20,
      isExam: false,
      order: 1,
    },
    {
      name: 'Test 2',
      description: 'Second continuous assessment test',
      maxScore: 20,
      isExam: false,
      order: 2,
    },
    {
      name: 'Exam',
      description: 'Final examination',
      maxScore: 60,
      isExam: true,
      order: 3,
    },
  ];
}

/**
 * Validate that an assessment structure totals 100%
 */
export function validateAssessmentStructureTotal(
  assessments: DefaultAssessmentStructure[],
): boolean {
  const total = assessments.reduce((sum, assessment) => sum + assessment.maxScore, 0);
  return total === 100;
}

/**
 * Get assessment structure for creating student assessments
 * Returns the structure needed for generating assessment data
 */
export function getAssessmentStructureForSeeding() {
  return [
    {
      name: 'Test 1',
      scoreRange: { min: 8, max: 20 },
      isExam: false,
    },
    {
      name: 'Test 2',
      scoreRange: { min: 8, max: 20 },
      isExam: false,
    },
    {
      name: 'Exam',
      scoreRange: { min: 30, max: 60 },
      isExam: true,
    },
  ];
}
