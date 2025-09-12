# Subject Assessment Scores API

## GET /api/teacher/subject-assessment-scores

**Description**: Retrieve assessment scores for a specific subject in a specific class using the school's standardized assessment structure. Accessible by both class teachers and subject teachers assigned to teach that subject.

**Authentication**: Bearer Token (JWT) required

**Authorization**: Teacher role required - must be either the class teacher OR assigned to teach the specified subject in the specified class

### Assessment Structure

The API uses a standardized assessment structure that can be customized per school:

**Default Structure:**
- **Test 1**: 20% (Regular assessment)
- **Test 2**: 20% (Regular assessment)  
- **Exam**: 60% (Final examination)

**Total**: 100%

Schools can modify this structure through the Assessment Structures API (`/api/assessment-structures`).

### Query Parameters

- `level` (required): Level name (e.g., JSS1, JSS2, SS1)
- `classArm` (required): Class arm name (e.g., A, B, Alpha)
- `subjectName` (required): Subject name to get assessment scores for

**Note**: The `grade` field in the response is calculated using the school's specific grading model. If no grading model is configured, a default grading system is used as fallback.

### Example Usage

```
GET /api/teacher/subject-assessment-scores?level=JSS3&classArm=A&subjectName=Mathematics
```

### Response Structure

```json
{
  "subject": {
    "subjectName": "Mathematics",
    "teacher": {
      "id": "teacher-456",
      "name": "John Doe"
    },
    "academicSession": {
      "id": "session-2024-2025",
      "name": "2024/2025 Academic Session",
      "isCurrent": true
    },
    "currentTerm": {
      "id": "term-first",
      "name": "First Term",
      "order": 1
    },
    "students": [
             {
               "id": "student-789",
               "studentNo": "JSS3A001",
               "fullName": "Jane Smith",
               "gender": "FEMALE",
        "assessments": [
          {
            "id": "assessment-1",
            "name": "Test 1",
            "score": 17,
            "maxScore": 20,
            "percentage": 85,
            "isExam": false,
            "date": "2025-01-15T10:00:00Z"
          },
          {
            "id": "assessment-2",
            "name": "Test 2",
            "score": 18,
            "maxScore": 20,
            "percentage": 90,
            "isExam": false,
            "date": "2025-02-15T10:00:00Z"
          },
          {
            "id": "assessment-3",
            "name": "Exam",
            "score": 54,
            "maxScore": 60,
            "percentage": 90,
            "isExam": true,
            "date": "2025-03-15T10:00:00Z"
          }
        ],
        "totalScore": 89,
        "averageScore": 30,
        "grade": "A"
      }
    ],
    "classStats": {
      "totalStudents": 25,
      "averageScore": 78,
      "highestScore": 95,
      "lowestScore": 45,
      "passRate": 88
    }
  }
}
```

### Response Fields

#### Subject Information
- `subjectName`: Name of the subject (e.g., Mathematics, English)
- `teacher`: Information about the teacher assigned to this subject

#### Academic Context
- `academicSession`: Current academic session information
  - `id`: Academic session ID
  - `name`: Academic session name (e.g., "2024/2025 Academic Session")
  - `isCurrent`: Whether this is the current academic session
- `currentTerm`: Current term information
  - `id`: Term ID
  - `name`: Term name (e.g., "First Term", "Second Term", "Third Term")
  - `order`: Term order (1, 2, 3)

#### Student Assessment Data
- `id`: Student ID
- `studentNo`: Student number
- `fullName`: Student's full name
- `gender`: Student's gender (MALE/FEMALE)
- `assessments`: Array of individual assessments following the school's standardized structure
  - `id`: Assessment ID
  - `name`: Assessment name (Test 1, Test 2, or Exam)
  - `score`: Student's score
  - `maxScore`: Maximum possible score (20 for Test 1/2, 60 for Exam by default)
  - `percentage`: Calculated percentage based on maxScore
  - `isExam`: Whether this is an exam (true for Exam, false for Test 1/2)
  - `date`: Date of the assessment
- `totalScore`: Sum of all assessment scores
- `averageScore`: Average of all assessment scores
- `grade`: Letter grade based on average score

#### Class Statistics
- `totalStudents`: Number of students with assessment data
- `averageScore`: Class average score
- `highestScore`: Highest score in the class
- `lowestScore`: Lowest score in the class
- `passRate`: Percentage of students who passed (score >= 50)

### Security

- Only teachers assigned to teach the specified subject in the specified class can access this data
- All data is scoped to the teacher's school
- Activity logging is enabled for audit purposes

### Error Responses

- `400 Bad Request`: Missing required parameters
- `401 Unauthorized`: Invalid or missing authentication token
- `403 Forbidden`: Teacher not assigned to teach this subject in this class
- `404 Not Found`: Class or subject not found

---

## Assessment Structures API

### GET /api/assessment-structures

**Description**: Retrieve all assessment structures for the school

**Authentication**: Bearer Token (JWT) required

**Authorization**: Teacher role required

### Response Structure

```json
[
  {
    "id": "structure-1",
    "name": "Test 1",
    "description": "First continuous assessment test",
    "maxScore": 20,
    "isExam": false,
    "order": 1,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  },
  {
    "id": "structure-2", 
    "name": "Test 2",
    "description": "Second continuous assessment test",
    "maxScore": 20,
    "isExam": false,
    "order": 2,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  },
  {
    "id": "structure-3",
    "name": "Exam",
    "description": "Final examination", 
    "maxScore": 60,
    "isExam": true,
    "order": 3,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

### POST /api/assessment-structures

**Description**: Create a new assessment structure

**Authentication**: Bearer Token (JWT) required

**Authorization**: Teacher role required

**Request Body:**
```json
{
  "name": "Test 1",
  "description": "First continuous assessment test",
  "maxScore": 20,
  "isExam": false,
  "order": 1
}
```

**Validation:**
- Total of all assessment structure maxScores cannot exceed 100%
- Name must be unique within the school
- maxScore must be between 1 and 100

### PATCH /api/assessment-structures/:id

**Description**: Update an existing assessment structure

**Authentication**: Bearer Token (JWT) required

**Authorization**: Teacher role required

### DELETE /api/assessment-structures/:id

**Description**: Delete an assessment structure (soft delete)

**Authentication**: Bearer Token (JWT) required

**Authorization**: Teacher role required

---

## Student Assessment Score Management API

### POST /api/teacher/student-assessment-scores

**Description**: Create a new assessment score for a student

**Authentication**: Bearer Token (JWT) required

**Authorization**: Teacher role required - must be assigned to teach the specified subject in the student's class

**Request Body:**
```json
{
  "studentId": "student-uuid",
  "subjectName": "Mathematics",
  "termName": "First Term",
  "assessmentName": "Test 1",
  "score": 18,
  "isExam": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Assessment score created successfully",
  "data": {
    "id": "assessment-score-uuid",
    "name": "Test 1",
    "score": 18,
    "isExam": false,
    "studentId": "student-uuid",
    "studentName": "Jane Smith",
    "subjectName": "Mathematics",
    "termName": "First Term",
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

### PATCH /api/teacher/student-assessment-scores/:id

**Description**: Update an existing student assessment score

**Authentication**: Bearer Token (JWT) required

**Authorization**: Teacher role required - must be assigned to teach the subject for this assessment

**Request Body:**
```json
{
  "score": 20,
  "assessmentName": "Test 1",
  "isExam": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Assessment score updated successfully",
  "data": {
    "id": "assessment-score-uuid",
    "name": "Test 1",
    "score": 20,
    "isExam": false,
    "studentId": "student-uuid",
    "studentName": "Jane Smith",
    "subjectName": "Mathematics",
    "termName": "First Term",
    "updatedAt": "2025-01-15T11:00:00Z"
  }
}
```

### DELETE /api/teacher/student-assessment-scores/:id

**Description**: Delete a student assessment score (soft delete)

**Authentication**: Bearer Token (JWT) required

**Authorization**: Teacher role required - must be assigned to teach the subject for this assessment

**Response:**
```json
{
  "success": true,
  "message": "Assessment score deleted successfully",
  "data": {
    "id": "assessment-score-uuid",
    "name": "Test 1",
    "score": 20,
    "studentName": "Jane Smith",
    "subjectName": "Mathematics",
    "termName": "First Term"
  }
}
```

### Error Responses

- `400 Bad Request`: Invalid request data (e.g., score out of range, missing required fields)
- `401 Unauthorized`: Invalid or missing authentication token
- `403 Forbidden`: Teacher not authorized to manage assessment scores for this student/subject
- `404 Not Found`: Student, subject, term, or assessment score not found

### Security Features

- **Authorization**: Teachers can only manage assessment scores for students in classes they teach
- **School Scoping**: All operations are scoped to the teacher's school
- **Activity Logging**: All create, update, and delete operations are logged for audit purposes
- **Data Validation**: Input validation ensures data integrity
- **Soft Delete**: Assessment scores are soft deleted to maintain data history
