# Bulk Student Assessment Scores API

## Overview

This document describes the bulk student assessment scores functionality that allows teachers to create and update multiple student assessment scores in a single API call. This is particularly useful for entering scores for an entire class or updating multiple scores at once.

## Endpoints

### PUT /api/teacher/student-assessment-scores/batch (Recommended)

**Description**: Create or update multiple student assessment scores in a single request. The system automatically detects existing scores and updates them instead of creating duplicates.

**Authentication**: Bearer Token (JWT) required

**Authorization**: Teacher role required - must be assigned to teach the specified subjects in the students' classes

**Request Body:**
```json
{
  "subjectName": "Mathematics",
  "termName": "First Term",
  "assessmentName": "Test 1",
  "assessmentScores": [
    {
      "id": "existing-assessment-uuid",
      "score": 18
    },
    {
      "studentId": "new-student-uuid",
      "score": 20
    }
  ]
}
```

**Validation Rules:**
- Maximum 100 assessment scores per request
- Minimum 1 assessment score required
- For **explicit updates**: Must include `id` field
- For **smart upsert**: Must include `studentId` and provide `subjectName`, `termName`, `assessmentName` at top level
- Score must be between 0 and 100
- Teacher must be assigned to teach the specified subject in the student's class
- `isExam` is optional and will be auto-determined from the assessment structure based on `assessmentName`

**Smart Upsert Behavior:**
- If no `id` is provided, the system checks if an assessment score already exists for the student/subject/term/assessment combination
- If found, it updates the existing score instead of creating a duplicate
- If not found, it creates a new assessment score
- This prevents duplicate entries when teachers submit scores multiple times

**Database-Level Protection:**
- A unique constraint ensures that a student cannot have multiple assessment scores for the same assessment in the same term
- The constraint is on `(subjectTermStudentId, name, deletedAt)` which prevents duplicates at the database level
- If duplicate creation is attempted, the database will throw a constraint violation error

**Response:**
```json
{
  "success": true,
  "message": "Upsert completed. 2 successful, 0 failed.",
  "status": 200,
  "data": {
    "success": [
      {
        "id": "existing-assessment-uuid",
        "name": "Test 1",
        "score": 18,
        "isExam": false,
        "studentId": "student-uuid-1",
        "studentName": "Jane Smith",
        "subjectName": "Mathematics",
        "termName": "First Term",
        "updatedAt": "2025-01-15T11:00:00Z"
      },
      {
        "id": "new-assessment-uuid",
        "name": "Test 1",
        "score": 20,
        "isExam": false,
        "studentId": "new-student-uuid",
        "studentName": "John Doe",
        "subjectName": "Mathematics",
        "termName": "First Term",
        "createdAt": "2025-01-15T11:00:00Z"
      }
    ],
    "failed": []
  }
}
```

### POST /api/teacher/student-assessment-scores/batch

**Description**: Create multiple student assessment scores in bulk

**Authentication**: Bearer Token (JWT) required

**Authorization**: Teacher role required - must be assigned to teach the specified subjects in the students' classes

**Request Body:**
```json
{
  "assessmentScores": [
    {
      "studentId": "student-uuid-1",
      "subjectName": "Mathematics",
      "termName": "First Term",
      "assessmentName": "Test 1",
      "score": 18,
      "isExam": false
    },
    {
      "studentId": "student-uuid-2",
      "subjectName": "Mathematics",
      "termName": "First Term",
      "assessmentName": "Test 1",
      "score": 20,
      "isExam": false
    },
    {
      "studentId": "student-uuid-3",
      "subjectName": "English",
      "termName": "First Term",
      "assessmentName": "Test 1",
      "score": 16,
      "isExam": false
    }
  ]
}
```

**Validation Rules:**
- Maximum 100 assessment scores per request
- Minimum 1 assessment score required
- Each assessment score must have valid `studentId`, `subjectName`, `termName`, `assessmentName`, and `score`
- Score must be between 0 and 100
- Teacher must be assigned to teach the specified subject in the student's class
- Student must exist and be in the teacher's school
- Subject term must exist and be active

**Response:**
```json
{
  "success": true,
  "message": "Bulk creation completed. 3 successful, 0 failed.",
  "status": 201,
  "data": {
    "success": [
      {
        "id": "assessment-score-uuid-1",
        "name": "Test 1",
        "score": 18,
        "isExam": false,
        "studentId": "student-uuid-1",
        "studentName": "Jane Smith",
        "subjectName": "Mathematics",
        "termName": "First Term",
        "createdAt": "2025-01-15T10:00:00Z"
      },
      {
        "id": "assessment-score-uuid-2",
        "name": "Test 1",
        "score": 20,
        "isExam": false,
        "studentId": "student-uuid-2",
        "studentName": "John Doe",
        "subjectName": "Mathematics",
        "termName": "First Term",
        "createdAt": "2025-01-15T10:00:00Z"
      },
      {
        "id": "assessment-score-uuid-3",
        "name": "Test 1",
        "score": 16,
        "isExam": false,
        "studentId": "student-uuid-3",
        "studentName": "Alice Johnson",
        "subjectName": "English",
        "termName": "First Term",
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ],
    "failed": []
  }
}
```

### PATCH /api/teacher/student-assessment-scores/batch

**Description**: Update multiple student assessment scores in bulk

**Authentication**: Bearer Token (JWT) required

**Authorization**: Teacher role required - must be assigned to teach the subjects for the assessments being updated

**Request Body:**
```json
{
  "assessmentScores": [
    {
      "id": "assessment-score-uuid-1",
      "score": 19,
      "assessmentName": "Test 1"
    },
    {
      "id": "assessment-score-uuid-2",
      "score": 22,
      "assessmentName": "Test 1"
    }
  ]
}
```

**Validation Rules:**
- Maximum 100 assessment scores per request
- Minimum 1 assessment score required
- Each assessment score must have a valid `id`
- Assessment score must exist and belong to the teacher's school
- Teacher must be authorized to modify the assessment score
- Score must be between 0 and 100 (if provided)

**Response:**
```json
{
  "success": true,
  "message": "Bulk update completed. 2 successful, 0 failed.",
  "status": 200,
  "data": {
    "success": [
      {
        "id": "assessment-score-uuid-1",
        "name": "Test 1",
        "score": 19,
        "isExam": false,
        "studentId": "student-uuid-1",
        "studentName": "Jane Smith",
        "subjectName": "Mathematics",
        "termName": "First Term",
        "updatedAt": "2025-01-15T11:00:00Z"
      },
      {
        "id": "assessment-score-uuid-2",
        "name": "Test 1",
        "score": 22,
        "isExam": false,
        "studentId": "student-uuid-2",
        "studentName": "John Doe",
        "subjectName": "Mathematics",
        "termName": "First Term",
        "updatedAt": "2025-01-15T11:00:00Z"
      }
    ],
    "failed": []
  }
}
```

## Error Handling

### Partial Success Response

When some assessment scores succeed and others fail, the API returns a response with both `success` and `failed` arrays:

```json
{
  "success": true,
  "message": "Bulk creation completed. 2 successful, 1 failed.",
  "status": 201,
  "data": {
    "success": [
      {
        "id": "assessment-score-uuid-1",
        "name": "Test 1",
        "score": 18,
        "isExam": false,
        "studentId": "student-uuid-1",
        "studentName": "Jane Smith",
        "subjectName": "Mathematics",
        "termName": "First Term",
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ],
    "failed": [
      {
        "assessmentScore": {
          "studentId": "invalid-student-id",
          "subjectName": "Mathematics",
          "termName": "First Term",
          "assessmentName": "Test 1",
          "score": 18
        },
        "error": "Student not found or not in your school"
      }
    ]
  }
}
```

### Common Error Responses

- `400 Bad Request`: Invalid request data (e.g., missing required fields, score out of range)
- `401 Unauthorized`: Invalid or missing authentication token
- `403 Forbidden`: Teacher not authorized to manage assessment scores for the specified students/subjects
- `404 Not Found`: Student, subject, term, or assessment score not found

## Implementation Details

### Files Created/Modified

1. **DTOs**:
   - `src/components/bff/teacher/dto/bulk-create-student-assessment-score.dto.ts`
   - `src/components/bff/teacher/dto/bulk-update-student-assessment-score.dto.ts`

2. **Result Classes**:
   - `src/components/bff/teacher/results/bulk-student-assessment-score-result.ts`

3. **Service**:
   - `src/components/bff/teacher/teacher.service.ts` - Added `bulkCreateStudentAssessmentScores()` and `bulkUpdateStudentAssessmentScores()` methods

4. **Controller**:
   - `src/components/bff/teacher/teacher.controller.ts` - Added bulk endpoints

5. **Index Files**:
   - Updated DTO and result index files to export new classes

### Key Features

1. **Authorization**: 
   - Verifies teacher is assigned to teach the specified subjects in the students' classes
   - Ensures all operations are scoped to the teacher's school
   - Validates teacher permissions for each assessment score

2. **Error Handling**:
   - Partial success support - some assessment scores can succeed while others fail
   - Detailed error messages for failed assessment scores
   - Continues processing even if individual assessment scores fail

3. **Data Integrity**:
   - Maintains existing validation rules from individual operations
   - Updates total scores for subject term students
   - Preserves referential integrity

4. **Performance**:
   - Processes assessment scores individually to maintain data consistency
   - Limits batch size to 100 assessment scores per request
   - Reuses existing validation and authorization logic

## Usage Examples

### Mixed Create and Update Operations (Recommended)

```bash
curl -X PUT /api/teacher/student-assessment-scores/batch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectName": "Mathematics",
    "termName": "First Term",
    "assessmentName": "Test 1",
    "assessmentScores": [
      {
        "id": "existing-assessment-1",
        "score": 19
      },
      {
        "studentId": "student-2",
        "score": 20
      },
      {
        "id": "existing-assessment-3",
        "score": 17
      }
    ]
  }'
```

### Entering Scores for an Entire Class

```bash
curl -X POST /api/teacher/student-assessment-scores/batch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assessmentScores": [
      {
        "studentId": "student-1",
        "subjectName": "Mathematics",
        "termName": "First Term",
        "assessmentName": "Test 1",
        "score": 18
      },
      {
        "studentId": "student-2",
        "subjectName": "Mathematics",
        "termName": "First Term",
        "assessmentName": "Test 1",
        "score": 20
      },
      {
        "studentId": "student-3",
        "subjectName": "Mathematics",
        "termName": "First Term",
        "assessmentName": "Test 1",
        "score": 16
      }
    ]
  }'
```

### Updating Multiple Scores

```bash
curl -X PATCH /api/teacher/student-assessment-scores/batch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assessmentScores": [
      {
        "id": "assessment-1",
        "score": 19
      },
      {
        "id": "assessment-2",
        "score": 22
      },
      {
        "id": "assessment-3",
        "score": 17
      }
    ]
  }'
```

### Mixed Subject Scores

```bash
curl -X POST /api/teacher/student-assessment-scores/batch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assessmentScores": [
      {
        "studentId": "student-1",
        "subjectName": "Mathematics",
        "termName": "First Term",
        "assessmentName": "Test 1",
        "score": 18
      },
      {
        "studentId": "student-1",
        "subjectName": "English",
        "termName": "First Term",
        "assessmentName": "Test 1",
        "score": 16
      },
      {
        "studentId": "student-2",
        "subjectName": "Mathematics",
        "termName": "First Term",
        "assessmentName": "Test 1",
        "score": 20
      }
    ]
  }'
```

## Security Considerations

- All operations are scoped to the authenticated teacher's school
- Authorization checks ensure only assigned teachers can manage assessment scores
- Input validation prevents malicious data injection
- Activity logging tracks all bulk operations for audit purposes
- Rate limiting should be considered for bulk operations

## Performance Considerations

- Bulk operations are more efficient than individual API calls
- Individual processing maintains data consistency and proper error handling
- Total scores are automatically recalculated for each student
- Consider implementing pagination for very large datasets
- Monitor database performance during bulk operations

## Integration with Existing Features

- **Assessment Structures**: Automatically determines `isExam` based on assessment structure
- **Grading Models**: Total scores are updated for grade calculation
- **Activity Logging**: All bulk operations are logged for audit purposes
- **Authorization**: Reuses existing teacher-subject-class assignment validation
- **Data Validation**: Maintains all existing validation rules and constraints
