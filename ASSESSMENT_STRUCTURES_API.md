# Assessment Structures API Documentation

## Overview

The Assessment Structures API allows schools to manage their standardized assessment structures (e.g., Test 1 (20%), Test 2 (20%), Exam (60%)). These structures define how student assessments are weighted and calculated across all subjects in the school.

## Key Features

- **Session-based Management**: Assessment structures are tied to academic sessions to maintain historical consistency
- **Smart Usage Validation**: Only prevents modification of critical fields (maxScore, isExam) when structures are in use
- **Name Editing**: Assessment structure names can be edited even when in use (no UI inconsistency)
- **Bulk Operations**: Create or update multiple assessment structures at once
- **Total Score Validation**: Ensures all assessment structures total exactly 100% per session

## Base URL

```
/api/assessment-structures
```

## Authentication

All endpoints require authentication via Bearer token in the Authorization header.

## Endpoints

### 1. Create Assessment Structure

**POST** `/api/assessment-structures`

Creates a new assessment structure for the school.

#### Request Body

```json
{
  "academicSessionId": "uuid-string",
  "name": "Test 1",
  "description": "First continuous assessment test",
  "maxScore": 20,
  "isExam": false,
  "order": 1
}
```

#### Response

```json
{
  "status": 201,
  "message": "Assessment structure created successfully",
  "data": {
    "id": "uuid",
    "name": "Test 1",
    "description": "First continuous assessment test",
    "maxScore": 20,
    "isExam": false,
    "order": 1,
    "isActive": true,
    "schoolId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Get All Assessment Structures

**GET** `/api/assessment-structures?academicSessionId=uuid`

Retrieves all assessment structures for the school. Optionally filter by academic session.

#### Response

```json
{
  "status": 200,
  "message": "Assessment structures retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Test 1",
      "description": "First continuous assessment test",
      "maxScore": 20,
      "isExam": false,
      "order": 1,
      "isActive": true,
      "schoolId": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 3. Get Single Assessment Structure

**GET** `/api/assessment-structures/:id`

Retrieves a specific assessment structure by ID.

#### Response

```json
{
  "status": 200,
  "message": "Assessment structure retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "Test 1",
    "description": "First continuous assessment test",
    "maxScore": 20,
    "isExam": false,
    "order": 1,
    "isActive": true,
    "schoolId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Update Assessment Structure

**PATCH** `/api/assessment-structures/:id`

Updates an existing assessment structure. **Name changes are always allowed. Critical fields (maxScore, isExam) cannot be changed if the structure is already being used in assessments.**

#### Request Body

```json
{
  "name": "Test 1 - Updated",
  "maxScore": 25,
  "isExam": false
}
```

#### Response

```json
{
  "status": 200,
  "message": "Assessment structure updated successfully",
  "data": {
    "id": "uuid",
    "name": "Test 1 - Updated",
    "description": "First continuous assessment test",
    "maxScore": 25,
    "isExam": false,
    "order": 1,
    "isActive": true,
    "schoolId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. Delete Assessment Structure

**DELETE** `/api/assessment-structures/:id`

Soft deletes an assessment structure. **Cannot be used if the structure is already being used in assessments.**

#### Response

```json
{
  "status": 200,
  "message": "Assessment structure deleted successfully"
}
```

### 6. Bulk Update Assessment Structures

**POST** `/api/assessment-structures/bulk`

Creates or updates multiple assessment structures at once. Useful for setting up the complete assessment structure for a school.

#### Request Body

```json
{
  "academicSessionId": "uuid",
  "assessmentStructures": [
    {
      "id": "existing-uuid",
      "name": "Test 1",
      "description": "First continuous assessment test",
      "maxScore": 20,
      "isExam": false,
      "order": 1
    },
    {
      "name": "Test 2",
      "description": "Second continuous assessment test",
      "maxScore": 20,
      "isExam": false,
      "order": 2
    },
    {
      "name": "Exam",
      "description": "Final examination",
      "maxScore": 60,
      "isExam": true,
      "order": 3
    }
  ]
}
```

#### Response

```json
{
  "status": 200,
  "message": "Bulk operation completed",
  "data": {
    "results": [
      {
        "index": 0,
        "action": "updated",
        "data": {
          "id": "existing-uuid",
          "name": "Test 1",
          "maxScore": 20,
          "isExam": false
        }
      },
      {
        "index": 1,
        "action": "created",
        "data": {
          "id": "new-uuid",
          "name": "Test 2",
          "maxScore": 20,
          "isExam": false
        }
      },
      {
        "index": 2,
        "action": "created",
        "data": {
          "id": "new-uuid-2",
          "name": "Exam",
          "maxScore": 60,
          "isExam": true
        }
      }
    ],
    "errors": [],
    "summary": {
      "total": 3,
      "successful": 3,
      "failed": 0
    }
  }
}
```

## Data Models

### AssessmentStructure

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `academicSessionId` | string | ID of the academic session this structure belongs to |
| `name` | string | Name of the assessment (e.g., "Test 1", "Exam") |
| `description` | string | Optional description |
| `maxScore` | number | Maximum score (must total 100 across all structures in the same session) |
| `isExam` | boolean | Whether this is an exam or regular assessment |
| `order` | number | Display order for UI |
| `isActive` | boolean | Whether the structure is active |
| `schoolId` | string | ID of the school |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |
| `deletedAt` | DateTime | Soft delete timestamp |

## Validation Rules

### Create/Update Validation

1. **Academic Session**: Required, must exist and belong to the school
2. **Name**: Required, must be unique within the school and session
3. **MaxScore**: Required, must be between 1 and 100
4. **Total Score**: All assessment structures must total exactly 100% within the same session
5. **Smart Usage Check**: Only prevents modification of critical fields (maxScore, isExam) when structures are in use
6. **Name Editing**: Assessment structure names can always be edited (no UI inconsistency)

### Bulk Update Validation

1. **Individual Validation**: Each structure follows the same rules as individual create/update
2. **Session Validation**: Each structure's academic session is validated individually
3. **Partial Success**: Operation continues even if some structures fail validation

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Cannot modify or delete assessment structure that is already being used in existing assessments",
  "error": "Bad Request"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Assessment structure not found",
  "error": "Not Found"
}
```

### 409 Conflict

```json
{
  "statusCode": 409,
  "message": "Assessment structure with this name already exists",
  "error": "Conflict"
}
```

## Usage Guidelines

### Setting Up Assessment Structures

1. **Plan Your Structure**: Determine the assessment types and their weights
2. **Ensure Total is 100%**: All maxScore values must sum to exactly 100
3. **Use Bulk Operations**: For initial setup, use the bulk endpoint to create all structures at once
4. **Order Matters**: Set the `order` field to control display sequence

### Modifying Existing Structures

1. **Check Usage**: The system prevents modification of structures already in use
2. **Session Awareness**: Consider the academic session when making changes
3. **Validation**: Total score validation ensures consistency

### Best Practices

1. **Early Setup**: Create assessment structures before any assessments are recorded
2. **Consistent Naming**: Use consistent naming conventions across the school
3. **Documentation**: Use descriptions to clarify the purpose of each structure
4. **Regular Review**: Periodically review and update structures as needed

## Integration Notes

- Assessment structures are automatically used in bulk Excel uploads
- Student performance reports use these structures for calculations
- The system validates assessment names against these structures
- Changes to structures affect all future assessments but not historical data
