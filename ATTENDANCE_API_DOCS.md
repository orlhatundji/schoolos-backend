# Attendance API Documentation

This document describes the attendance management endpoints for teachers to mark student attendance.

## Overview

The attendance system supports two types of attendance marking:
1. **Class Attendance**: Marked by class teachers for their assigned classes
2. **Subject Attendance**: Marked by subject teachers for their assigned subjects and classes

## Authentication

All endpoints require JWT authentication. Include the Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. Mark Class Attendance

**Endpoint**: `POST /api/teacher/attendance/class`

**Description**: Allows class teachers to mark attendance for students in their assigned class.

**Authorization**: Only teachers assigned as class teachers for the specified class arm can mark attendance.

**Request Body**:
```json
{
  "classArmId": "class-arm-uuid",
  "date": "2024-01-15",
  "academicSessionId": "session-uuid",
  "termId": "term-uuid",
  "studentAttendances": [
    {
      "studentId": "student-uuid-1",
      "status": "PRESENT",
      "remarks": "On time"
    },
    {
      "studentId": "student-uuid-2",
      "status": "ABSENT",
      "remarks": "No excuse provided"
    },
    {
      "studentId": "student-uuid-3",
      "status": "LATE",
      "remarks": "Late due to traffic"
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Class attendance marked successfully",
  "data": {
    "classArmId": "class-arm-uuid",
    "classArmName": "JSS1A",
    "date": "2024-01-15T00:00:00.000Z",
    "academicSessionId": "session-uuid",
    "termId": "term-uuid",
    "attendanceRecords": [
      {
        "studentId": "student-uuid-1",
        "studentName": "John Doe",
        "studentNo": "STU001",
        "status": "PRESENT",
        "remarks": "On time",
        "date": "2024-01-15T00:00:00.000Z"
      }
    ],
    "totalStudents": 3,
    "presentCount": 1,
    "absentCount": 1,
    "lateCount": 1,
    "excusedCount": 0
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request data
- `403 Forbidden`: Teacher not authorized to mark attendance for this class
- `404 Not Found`: Class arm, academic session, or term not found

### 2. Mark Subject Attendance

**Endpoint**: `POST /api/teacher/attendance/subject`

**Description**: Allows subject teachers to mark attendance for students in their assigned subject and class.

**Authorization**: Only teachers assigned to teach the specified subject for the specified class arm can mark attendance.

**Request Body**:
```json
{
  "subjectId": "subject-uuid",
  "classArmId": "class-arm-uuid",
  "date": "2024-01-15",
  "academicSessionId": "session-uuid",
  "termId": "term-uuid",
  "studentAttendances": [
    {
      "studentId": "student-uuid-1",
      "status": "PRESENT",
      "remarks": "Participated actively"
    },
    {
      "studentId": "student-uuid-2",
      "status": "ABSENT",
      "remarks": "No excuse provided"
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Subject attendance marked successfully",
  "data": {
    "subjectId": "subject-uuid",
    "subjectName": "Mathematics",
    "classArmId": "class-arm-uuid",
    "classArmName": "JSS1A",
    "date": "2024-01-15T00:00:00.000Z",
    "academicSessionId": "session-uuid",
    "termId": "term-uuid",
    "attendanceRecords": [
      {
        "studentId": "student-uuid-1",
        "studentName": "John Doe",
        "studentNo": "STU001",
        "status": "PRESENT",
        "remarks": "Participated actively",
        "date": "2024-01-15T00:00:00.000Z"
      }
    ],
    "totalStudents": 2,
    "presentCount": 1,
    "absentCount": 1,
    "lateCount": 0,
    "excusedCount": 0
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request data
- `403 Forbidden`: Teacher not authorized to mark attendance for this subject and class
- `404 Not Found`: Subject, class arm, academic session, or term not found

## Data Models

### Attendance Status Enum

```typescript
enum AttendanceStatus {
  PRESENT = "PRESENT",
  ABSENT = "ABSENT", 
  LATE = "LATE",
  EXCUSED = "EXCUSED"
}
```

### Student Attendance DTO

```typescript
class StudentAttendanceDto {
  studentId: string;        // UUID of the student
  status: AttendanceStatus; // Attendance status
  remarks?: string;         // Optional remarks
}
```

### Class Attendance DTO

```typescript
class MarkClassAttendanceDto {
  classArmId: string;                    // UUID of the class arm
  date: string;                          // Date in YYYY-MM-DD format
  academicSessionId: string;             // UUID of the academic session
  termId: string;                         // UUID of the term
  studentAttendances: StudentAttendanceDto[]; // Array of student attendance records
}
```

### Subject Attendance DTO

```typescript
class MarkSubjectAttendanceDto {
  subjectId: string;                     // UUID of the subject
  classArmId: string;                    // UUID of the class arm
  date: string;                          // Date in YYYY-MM-DD format
  academicSessionId: string;             // UUID of the academic session
  termId: string;                        // UUID of the term
  studentAttendances: StudentAttendanceDto[]; // Array of student attendance records
}
```

## Authorization Rules

### Class Attendance Authorization
- Teacher must be assigned as a class teacher for the specified class arm
- Assignment is verified through the `ClassArmTeacher` relationship

### Subject Attendance Authorization
- Teacher must be assigned to teach the specified subject for the specified class arm
- Assignment is verified through the `ClassArmSubjectTeacher` relationship

## Business Rules

1. **Unique Attendance**: Only one attendance record per student per date is allowed
2. **Authorization**: Teachers can only mark attendance for classes/subjects they are assigned to
3. **Data Validation**: All required fields must be provided and valid
4. **Upsert Behavior**: If attendance already exists for a student on a date, it will be updated
5. **Activity Logging**: All attendance marking activities are logged for audit purposes

## Usage Examples

### Example 1: Marking Class Attendance

```bash
curl -X POST "https://api.schoolos.com/teacher/attendance/class" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "classArmId": "class-arm-uuid",
    "date": "2024-01-15",
    "academicSessionId": "session-uuid",
    "termId": "term-uuid",
    "studentAttendances": [
      {
        "studentId": "student-uuid-1",
        "status": "PRESENT"
      },
      {
        "studentId": "student-uuid-2",
        "status": "ABSENT",
        "remarks": "No excuse provided"
      }
    ]
  }'
```

### Example 2: Marking Subject Attendance

```bash
curl -X POST "https://api.schoolos.com/teacher/attendance/subject" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectId": "subject-uuid",
    "classArmId": "class-arm-uuid",
    "date": "2024-01-15",
    "academicSessionId": "session-uuid",
    "termId": "term-uuid",
    "studentAttendances": [
      {
        "studentId": "student-uuid-1",
        "status": "PRESENT",
        "remarks": "Participated actively in class"
      }
    ]
  }'
```

## Notes

- All dates should be in ISO 8601 format (YYYY-MM-DD)
- The system automatically handles timezone conversion
- Attendance records are immutable once created (can only be updated, not deleted)
- All attendance marking activities are logged for audit and compliance purposes
- The system supports bulk attendance marking for efficiency
