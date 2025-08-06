# Settings Management API Specifications

## Overview
This document outlines the API endpoints for the Settings module of the school management system. The Settings module handles the configuration and management of departments, academic levels, academic sessions, and other institutional configurations.

## Base URL
```
/api/settings
```

## Authentication
All endpoints require JWT authentication with appropriate role permissions:
- **SUPER_ADMIN**: Full access to all settings
- **ADMIN**: Limited access to non-critical settings
- **HOD**: Read-only access to department-related settings

---

## 1. Departments Management

### 1.1 Get Departments Overview
**Endpoint:** `GET /api/settings/departments/overview`

**Description:** Get overview statistics for departments management

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalDepartments": 4,
    "activeDepartments": 4,
    "inactiveDepartments": 0,
    "totalClassrooms": 31,
    "averageClassroomsPerDepartment": 7.75,
    "departmentDistribution": [
      {
        "name": "General Studies",
        "classroomCount": 12,
        "percentage": 38.7
      },
      {
        "name": "Science",
        "classroomCount": 8,
        "percentage": 25.8
      },
      {
        "name": "Commercial",
        "classroomCount": 6,
        "percentage": 19.4
      },
      {
        "name": "Arts",
        "classroomCount": 5,
        "percentage": 16.1
      }
    ]
  }
}
```

### 1.2 Get All Departments
**Endpoint:** `GET /api/settings/departments`

**Description:** Get paginated list of all departments

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
```
page?: number = 1
limit?: number = 10
search?: string
status?: 'ACTIVE' | 'INACTIVE'
sortBy?: 'name' | 'code' | 'classroomCount' | 'createdAt'
sortOrder?: 'asc' | 'desc' = 'asc'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": "dept_001",
        "name": "Science",
        "description": "Science and Mathematics",
        "code": "SCI",
        "classroomCount": 8,
        "status": "ACTIVE",
        "hodId": "hod_001",
        "hod": {
          "id": "hod_001",
          "user": {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@school.edu"
          }
        },
        "subjects": [
          {
            "id": "subj_001",
            "name": "Mathematics",
            "code": "MATH"
          }
        ],
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 4,
      "itemsPerPage": 10,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### 1.3 Get Department by ID
**Endpoint:** `GET /api/settings/departments/{departmentId}`

**Description:** Get detailed information about a specific department

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "dept_001",
    "name": "Science",
    "description": "Science and Mathematics",
    "code": "SCI",
    "status": "ACTIVE",
    "hodId": "hod_001",
    "hod": {
      "id": "hod_001",
      "user": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@school.edu",
        "phoneNumber": "+1234567890"
      }
    },
    "subjects": [
      {
        "id": "subj_001",
        "name": "Mathematics",
        "code": "MATH",
        "teacherCount": 5
      }
    ],
    "classrooms": [
      {
        "id": "class_001",
        "name": "Science Lab 1",
        "capacity": 30,
        "level": "SS1"
      }
    ],
    "teachers": [
      {
        "id": "teacher_001",
        "user": {
          "firstName": "Jane",
          "lastName": "Smith"
        },
        "subjects": ["Mathematics", "Physics"]
      }
    ],
    "statistics": {
      "totalStudents": 250,
      "totalTeachers": 12,
      "totalSubjects": 8,
      "totalClassrooms": 8
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

### 1.4 Create New Department
**Endpoint:** `POST /api/settings/departments`

**Description:** Create a new department

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Technology",
  "description": "Computer Science and Information Technology",
  "code": "TECH",
  "hodId": "hod_002"
}
```

**Validation Rules:**
- `name`: Required, 2-100 characters, unique
- `description`: Optional, max 500 characters
- `code`: Required, 2-10 characters, unique, uppercase
- `hodId`: Optional, must exist in HOD table

**Response:**
```json
{
  "success": true,
  "message": "Department created successfully",
  "data": {
    "id": "dept_005",
    "name": "Technology",
    "description": "Computer Science and Information Technology",
    "code": "TECH",
    "status": "ACTIVE",
    "hodId": "hod_002",
    "classroomCount": 0,
    "createdAt": "2024-08-02T21:50:26Z",
    "updatedAt": "2024-08-02T21:50:26Z"
  }
}
```

### 1.5 Update Department
**Endpoint:** `PUT /api/settings/departments/{departmentId}`

**Description:** Update an existing department

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Science & Mathematics",
  "description": "Science, Mathematics and Computer Studies",
  "code": "SCI",
  "hodId": "hod_003"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Department updated successfully",
  "data": {
    "id": "dept_001",
    "name": "Science & Mathematics",
    "description": "Science, Mathematics and Computer Studies",
    "code": "SCI",
    "status": "ACTIVE",
    "hodId": "hod_003",
    "classroomCount": 8,
    "updatedAt": "2024-08-02T21:50:26Z"
  }
}
```

### 1.6 Toggle Department Status
**Endpoint:** `PATCH /api/settings/departments/{departmentId}/status`

**Description:** Activate or deactivate a department

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "INACTIVE"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Department status updated successfully",
  "data": {
    "id": "dept_001",
    "status": "INACTIVE",
    "updatedAt": "2024-08-02T21:50:26Z"
  }
}
```

### 1.7 Delete Department
**Endpoint:** `DELETE /api/settings/departments/{departmentId}`

**Description:** Delete a department (soft delete)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Department deleted successfully"
}
```

---

## 2. Academic Levels Management

### 2.1 Get Academic Levels Overview
**Endpoint:** `GET /api/settings/academic-levels/overview`

**Description:** Get overview statistics for academic levels

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLevels": 6,
    "activeLevels": 6,
    "inactiveLevels": 0,
    "totalClassrooms": 24,
    "averageClassroomsPerLevel": 4,
    "levelDistribution": [
      {
        "name": "JSS 1",
        "order": 1,
        "classroomCount": 4,
        "studentCount": 120
      },
      {
        "name": "JSS 2",
        "order": 2,
        "classroomCount": 4,
        "studentCount": 115
      },
      {
        "name": "JSS 3",
        "order": 3,
        "classroomCount": 4,
        "studentCount": 110
      },
      {
        "name": "SS 1",
        "order": 4,
        "classroomCount": 4,
        "studentCount": 105
      },
      {
        "name": "SS 2",
        "order": 5,
        "classroomCount": 4,
        "studentCount": 100
      },
      {
        "name": "SS 3",
        "order": 6,
        "classroomCount": 4,
        "studentCount": 95
      }
    ]
  }
}
```

### 2.2 Get All Academic Levels
**Endpoint:** `GET /api/settings/academic-levels`

**Description:** Get paginated list of all academic levels with order management

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
```
page?: number = 1
limit?: number = 10
search?: string
status?: 'ACTIVE' | 'INACTIVE'
sortBy?: 'order' | 'name' | 'code' | 'classroomCount'
sortOrder?: 'asc' | 'desc' = 'asc'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "levels": [
      {
        "id": "level_001",
        "order": 1,
        "name": "JSS 1",
        "code": "JSS1",
        "classroomCount": 4,
        "status": "ACTIVE",
        "description": "Junior Secondary School 1",
        "classArms": [
          {
            "id": "arm_001",
            "name": "JSS 1A",
            "capacity": 30,
            "currentStudentCount": 28
          }
        ],
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 6,
      "itemsPerPage": 10,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### 2.3 Get Academic Level by ID
**Endpoint:** `GET /api/settings/academic-levels/{levelId}`

**Description:** Get detailed information about a specific academic level

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "level_001",
    "order": 1,
    "name": "JSS 1",
    "code": "JSS1",
    "description": "Junior Secondary School 1",
    "status": "ACTIVE",
    "classArms": [
      {
        "id": "arm_001",
        "name": "JSS 1A",
        "capacity": 30,
        "currentStudentCount": 28,
        "classTeacher": {
          "id": "teacher_001",
          "user": {
            "firstName": "Mary",
            "lastName": "Johnson"
          }
        }
      }
    ],
    "subjects": [
      {
        "id": "subj_001",
        "name": "Mathematics",
        "code": "MATH",
        "isCore": true,
        "teachers": [
          {
            "id": "teacher_002",
            "user": {
              "firstName": "John",
              "lastName": "Smith"
            }
          }
        ]
      }
    ],
    "statistics": {
      "totalStudents": 120,
      "totalClassArms": 4,
      "totalSubjects": 12,
      "averageClassSize": 30,
      "attendanceRate": 95.5
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

### 2.4 Create New Academic Level
**Endpoint:** `POST /api/settings/academic-levels`

**Description:** Create a new academic level

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Nursery 1",
  "code": "NUR1",
  "description": "Nursery School Level 1",
  "order": 1
}
```

**Validation Rules:**
- `name`: Required, 2-50 characters, unique
- `code`: Required, 2-10 characters, unique, uppercase
- `description`: Optional, max 200 characters
- `order`: Required, positive integer, unique

**Response:**
```json
{
  "success": true,
  "message": "Academic level created successfully",
  "data": {
    "id": "level_007",
    "order": 1,
    "name": "Nursery 1",
    "code": "NUR1",
    "description": "Nursery School Level 1",
    "status": "ACTIVE",
    "classroomCount": 0,
    "createdAt": "2024-08-02T21:50:26Z",
    "updatedAt": "2024-08-02T21:50:26Z"
  }
}
```

### 2.5 Update Academic Level
**Endpoint:** `PUT /api/settings/academic-levels/{levelId}`

**Description:** Update an existing academic level

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "JSS 1 (Junior Secondary)",
  "code": "JSS1",
  "description": "Junior Secondary School Level 1",
  "order": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Academic level updated successfully",
  "data": {
    "id": "level_001",
    "order": 1,
    "name": "JSS 1 (Junior Secondary)",
    "code": "JSS1",
    "description": "Junior Secondary School Level 1",
    "status": "ACTIVE",
    "classroomCount": 4,
    "updatedAt": "2024-08-02T21:50:26Z"
  }
}
```

### 2.6 Reorder Academic Levels
**Endpoint:** `PATCH /api/settings/academic-levels/reorder`

**Description:** Update the order of academic levels

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "levels": [
    {
      "id": "level_001",
      "order": 2
    },
    {
      "id": "level_002",
      "order": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Academic levels reordered successfully",
  "data": {
    "updatedLevels": [
      {
        "id": "level_001",
        "order": 2,
        "name": "JSS 1"
      },
      {
        "id": "level_002",
        "order": 1,
        "name": "JSS 2"
      }
    ]
  }
}
```

### 2.7 Toggle Academic Level Status
**Endpoint:** `PATCH /api/settings/academic-levels/{levelId}/status`

**Description:** Activate or deactivate an academic level

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "INACTIVE"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Academic level status updated successfully",
  "data": {
    "id": "level_001",
    "status": "INACTIVE",
    "updatedAt": "2024-08-02T21:50:26Z"
  }
}
```

### 2.8 Delete Academic Level
**Endpoint:** `DELETE /api/settings/academic-levels/{levelId}`

**Description:** Delete an academic level (soft delete)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Academic level deleted successfully"
}
```

---

## 3. Academic Sessions & Terms Management

### 3.1 Get Academic Sessions Overview
**Endpoint:** `GET /api/settings/academic-sessions/overview`

**Description:** Get overview of academic sessions and terms

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSessions": 3,
    "activeSessions": 1,
    "currentSession": {
      "id": "session_003",
      "name": "2024/2025",
      "startDate": "2024-09-01",
      "endDate": "2025-07-31",
      "status": "ACTIVE"
    },
    "currentTerm": {
      "id": "term_001",
      "name": "First Term",
      "startDate": "2024-09-01",
      "endDate": "2024-12-20",
      "status": "ACTIVE"
    },
    "termProgress": 45.5,
    "sessionProgress": 25.3,
    "upcomingEvents": [
      {
        "type": "TERM_END",
        "date": "2024-12-20",
        "description": "First Term Ends"
      }
    ]
  }
}
```

### 3.2 Get All Academic Sessions
**Endpoint:** `GET /api/settings/academic-sessions`

**Description:** Get paginated list of academic sessions matching the UI table format

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
```
page?: number = 1
limit?: number = 10
status?: 'ACTIVE' | 'INACTIVE' | 'COMPLETED'
sortBy?: 'name' | 'startDate' | 'createdAt'
sortOrder?: 'asc' | 'desc' = 'desc'
search?: string
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session_001",
        "name": "2024/2025",
        "duration": {
          "startDate": "2024-09-01",
          "endDate": "2025-07-31",
          "formatted": "Sep 1, 2024 - Jul 31, 2025"
        },
        "termsCount": 3,
        "currentTerm": {
          "name": "Second Term",
          "isActive": true
        },
        "status": "ACTIVE",
        "isCurrentSession": true,
        "createdDate": "2024-08-15",
        "terms": [
          {
            "id": "term_001",
            "name": "First Term",
            "startDate": "2024-09-01",
            "endDate": "2024-12-20",
            "status": "COMPLETED"
          },
          {
            "id": "term_002",
            "name": "Second Term",
            "startDate": "2025-01-05",
            "endDate": "2025-04-10",
            "status": "ACTIVE"
          },
          {
            "id": "term_003",
            "name": "Third Term",
            "startDate": "2025-04-20",
            "endDate": "2025-07-31",
            "status": "PENDING"
          }
        ]
      },
      {
        "id": "session_002",
        "name": "2023/2024",
        "duration": {
          "startDate": "2023-09-01",
          "endDate": "2024-07-31",
          "formatted": "Sep 1, 2023 - Jul 31, 2024"
        },
        "termsCount": 3,
        "currentTerm": null,
        "status": "INACTIVE",
        "isCurrentSession": false,
        "createdDate": "2023-08-15",
        "terms": []
      },
      {
        "id": "session_003",
        "name": "2025/2026",
        "duration": {
          "startDate": "2025-09-01",
          "endDate": "2026-07-31",
          "formatted": "Sep 1, 2025 - Jul 31, 2026"
        },
        "termsCount": 0,
        "currentTerm": null,
        "status": "INACTIVE",
        "isCurrentSession": false,
        "createdDate": "2025-07-01",
        "terms": []
      },
      {
        "id": "session_004",
        "name": "2022/2023",
        "duration": {
          "startDate": "2022-09-01",
          "endDate": "2023-07-31",
          "formatted": "Sep 1, 2022 - Jul 31, 2023"
        },
        "termsCount": 0,
        "currentTerm": null,
        "status": "INACTIVE",
        "isCurrentSession": false,
        "createdDate": "2022-08-15",
        "terms": []
      },
      {
        "id": "session_005",
        "name": "2021/2022",
        "duration": {
          "startDate": "2021-09-01",
          "endDate": "2022-07-31",
          "formatted": "Sep 1, 2021 - Jul 31, 2022"
        },
        "termsCount": 0,
        "currentTerm": null,
        "status": "INACTIVE",
        "isCurrentSession": false,
        "createdDate": "2021-08-15",
        "terms": []
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 5,
      "itemsPerPage": 10,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### 3.3 Get Academic Session by ID
**Endpoint:** `GET /api/settings/academic-sessions/{sessionId}`

**Description:** Get detailed information about a specific academic session with all terms

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "session_001",
    "name": "2024/2025",
    "duration": {
      "startDate": "2024-09-01",
      "endDate": "2025-07-31",
      "formatted": "Sep 1, 2024 - Jul 31, 2025",
      "totalDays": 304,
      "remainingDays": 180
    },
    "status": "ACTIVE",
    "isCurrentSession": true,
    "termsCount": 3,
    "currentTerm": {
      "id": "term_002",
      "name": "Second Term",
      "startDate": "2025-01-05",
      "endDate": "2025-04-10",
      "status": "ACTIVE",
      "progress": 45.5
    },
    "terms": [
      {
        "id": "term_001",
        "name": "First Term",
        "startDate": "2024-09-01",
        "endDate": "2024-12-20",
        "status": "COMPLETED",
        "duration": 111,
        "academicWeeks": 14,
        "holidayWeeks": 2
      },
      {
        "id": "term_002",
        "name": "Second Term",
        "startDate": "2025-01-05",
        "endDate": "2025-04-10",
        "status": "ACTIVE",
        "duration": 95,
        "academicWeeks": 12,
        "holidayWeeks": 1
      },
      {
        "id": "term_003",
        "name": "Third Term",
        "startDate": "2025-04-20",
        "endDate": "2025-07-31",
        "status": "PENDING",
        "duration": 102,
        "academicWeeks": 13,
        "holidayWeeks": 1
      }
    ],
    "statistics": {
      "totalStudents": 1250,
      "totalTeachers": 85,
      "totalSubjects": 24,
      "averageAttendance": 94.2,
      "completedTerms": 1,
      "pendingTerms": 2
    },
    "createdAt": "2024-08-15T10:00:00Z",
    "updatedAt": "2025-01-05T08:00:00Z"
  }
}
```

### 3.4 Create Academic Session
**Endpoint:** `POST /api/settings/academic-sessions`

**Description:** Create a new academic session with terms

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "2025/2026",
  "startDate": "2025-09-01",
  "endDate": "2026-07-31",
  "terms": [
    {
      "name": "First Term",
      "startDate": "2025-09-01",
      "endDate": "2025-12-20"
    },
    {
      "name": "Second Term",
      "startDate": "2026-01-05",
      "endDate": "2026-04-10"
    },
    {
      "name": "Third Term",
      "startDate": "2026-04-20",
      "endDate": "2026-07-31"
    }
  ]
}
```

**Validation Rules:**
- `name`: Required, unique, format "YYYY/YYYY"
- `startDate`: Required, must be future date
- `endDate`: Required, must be after startDate
- `terms`: Required array, minimum 1 term
- Term dates must not overlap
- Term dates must be within session duration

**Response:**
```json
{
  "success": true,
  "message": "Academic session created successfully",
  "data": {
    "id": "session_006",
    "name": "2025/2026",
    "duration": {
      "startDate": "2025-09-01",
      "endDate": "2026-07-31",
      "formatted": "Sep 1, 2025 - Jul 31, 2026"
    },
    "status": "INACTIVE",
    "termsCount": 3,
    "terms": [
      {
        "id": "term_007",
        "name": "First Term",
        "startDate": "2025-09-01",
        "endDate": "2025-12-20",
        "status": "PENDING"
      },
      {
        "id": "term_008",
        "name": "Second Term",
        "startDate": "2026-01-05",
        "endDate": "2026-04-10",
        "status": "PENDING"
      },
      {
        "id": "term_009",
        "name": "Third Term",
        "startDate": "2026-04-20",
        "endDate": "2026-07-31",
        "status": "PENDING"
      }
    ],
    "createdAt": "2024-08-02T21:50:48Z"
  }
}
```

### 3.5 Update Academic Session
**Endpoint:** `PUT /api/settings/academic-sessions/{sessionId}`

**Description:** Update an existing academic session

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "2024/2025 Academic Year",
  "startDate": "2024-09-01",
  "endDate": "2025-07-31"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Academic session updated successfully",
  "data": {
    "id": "session_001",
    "name": "2024/2025 Academic Year",
    "duration": {
      "startDate": "2024-09-01",
      "endDate": "2025-07-31",
      "formatted": "Sep 1, 2024 - Jul 31, 2025"
    },
    "updatedAt": "2024-08-02T21:50:48Z"
  }
}
```

### 3.6 Activate Academic Session
**Endpoint:** `PATCH /api/settings/academic-sessions/{sessionId}/activate`

**Description:** Set a session as the current active session

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Academic session activated successfully",
  "data": {
    "id": "session_001",
    "name": "2024/2025",
    "status": "ACTIVE",
    "isCurrentSession": true,
    "previousActiveSession": {
      "id": "session_002",
      "name": "2023/2024",
      "status": "COMPLETED"
    },
    "activatedAt": "2024-08-02T21:50:48Z"
  }
}
```

### 3.7 Deactivate Academic Session
**Endpoint:** `PATCH /api/settings/academic-sessions/{sessionId}/deactivate`

**Description:** Deactivate a session (mark as completed/inactive)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Academic session deactivated successfully",
  "data": {
    "id": "session_001",
    "name": "2024/2025",
    "status": "INACTIVE",
    "isCurrentSession": false,
    "deactivatedAt": "2024-08-02T21:50:48Z"
  }
}
```

### 3.8 Delete Academic Session
**Endpoint:** `DELETE /api/settings/academic-sessions/{sessionId}`

**Description:** Delete an academic session (soft delete)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Academic session deleted successfully"
}
```

---

## 4. Academic Terms Management

### 4.1 Get Terms for Session
**Endpoint:** `GET /api/settings/academic-sessions/{sessionId}/terms`

**Description:** Get all terms for a specific academic session

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_001",
    "sessionName": "2024/2025",
    "terms": [
      {
        "id": "term_001",
        "name": "First Term",
        "startDate": "2024-09-01",
        "endDate": "2024-12-20",
        "status": "COMPLETED",
        "duration": 111,
        "academicWeeks": 14,
        "holidays": [
          {
            "name": "Mid-term Break",
            "startDate": "2024-10-15",
            "endDate": "2024-10-18"
          }
        ]
      },
      {
        "id": "term_002",
        "name": "Second Term",
        "startDate": "2025-01-05",
        "endDate": "2025-04-10",
        "status": "ACTIVE",
        "duration": 95,
        "academicWeeks": 12,
        "progress": 45.5,
        "remainingDays": 52
      },
      {
        "id": "term_003",
        "name": "Third Term",
        "startDate": "2025-04-20",
        "endDate": "2025-07-31",
        "status": "PENDING",
        "duration": 102,
        "academicWeeks": 13
      }
    ]
  }
}
```

### 4.2 Create Term for Session
**Endpoint:** `POST /api/settings/academic-sessions/{sessionId}/terms`

**Description:** Add a new term to an existing academic session

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Fourth Term",
  "startDate": "2025-08-01",
  "endDate": "2025-08-31"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Term created successfully",
  "data": {
    "id": "term_010",
    "name": "Fourth Term",
    "startDate": "2025-08-01",
    "endDate": "2025-08-31",
    "status": "PENDING",
    "sessionId": "session_001",
    "createdAt": "2024-08-02T21:50:48Z"
  }
}
```

### 4.3 Update Term
**Endpoint:** `PUT /api/settings/academic-sessions/{sessionId}/terms/{termId}`

**Description:** Update an existing term

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "First Term (Updated)",
  "startDate": "2024-09-01",
  "endDate": "2024-12-22"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Term updated successfully",
  "data": {
    "id": "term_001",
    "name": "First Term (Updated)",
    "startDate": "2024-09-01",
    "endDate": "2024-12-22",
    "updatedAt": "2024-08-02T21:50:48Z"
  }
}
```

### 4.4 Activate Term
**Endpoint:** `PATCH /api/settings/academic-sessions/{sessionId}/terms/{termId}/activate`

**Description:** Set a term as the current active term

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Term activated successfully",
  "data": {
    "id": "term_002",
    "name": "Second Term",
    "status": "ACTIVE",
    "sessionId": "session_001",
    "previousActiveTerm": {
      "id": "term_001",
      "name": "First Term",
      "status": "COMPLETED"
    },
    "activatedAt": "2024-08-02T21:50:48Z"
  }
}
```

### 4.5 Complete Term
**Endpoint:** `PATCH /api/settings/academic-sessions/{sessionId}/terms/{termId}/complete`

**Description:** Mark a term as completed

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Term completed successfully",
  "data": {
    "id": "term_001",
    "name": "First Term",
    "status": "COMPLETED",
    "completedAt": "2024-12-20T23:59:59Z",
    "statistics": {
      "totalStudentsAssessed": 1250,
      "averageAttendance": 96.2,
      "completedAssessments": 245
    }
  }
}
```

### 4.6 Delete Term
**Endpoint:** `DELETE /api/settings/academic-sessions/{sessionId}/terms/{termId}`

**Description:** Delete a term (soft delete)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Term deleted successfully"
}
```

---

## 5. Session Actions & Bulk Operations

### 5.1 Duplicate Academic Session
**Endpoint:** `POST /api/settings/academic-sessions/{sessionId}/duplicate`

**Description:** Create a copy of an existing session with new dates

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "newSessionName": "2026/2027",
  "startDate": "2026-09-01",
  "copyTermStructure": true,
  "adjustTermDates": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Academic session duplicated successfully",
  "data": {
    "newSession": {
      "id": "session_007",
      "name": "2026/2027",
      "startDate": "2026-09-01",
      "endDate": "2027-07-31",
      "termsCount": 3,
      "status": "INACTIVE"
    },
    "originalSessionId": "session_001"
  }
}
```

### 5.2 Archive Multiple Sessions
**Endpoint:** `PATCH /api/settings/academic-sessions/archive`

**Description:** Archive multiple sessions at once

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "sessionIds": ["session_002", "session_003", "session_004"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sessions archived successfully",
  "data": {
    "archivedSessions": 3,
    "failedSessions": [],
    "archivedAt": "2024-08-02T21:50:48Z"
  }
}
```

### 5.3 Get Session Statistics
**Endpoint:** `GET /api/settings/academic-sessions/{sessionId}/statistics`

**Description:** Get detailed statistics for a specific session

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_001",
    "sessionName": "2024/2025",
    "overview": {
      "totalTerms": 3,
      "completedTerms": 1,
      "activeTerms": 1,
      "pendingTerms": 1,
      "sessionProgress": 35.2
    },
    "academics": {
      "totalStudents": 1250,
      "totalTeachers": 85,
      "totalSubjects": 24,
      "totalAssessments": 456,
      "averageScore": 78.5
    },
    "attendance": {
      "overallAttendanceRate": 94.2,
      "studentAttendanceRate": 95.1,
      "teacherAttendanceRate": 97.8
    },
    "financial": {
      "totalFeesCollected": 45000000,
      "pendingFees": 8500000,
      "collectionRate": 84.1
    },
    "termBreakdown": [
      {
        "termId": "term_001",
        "termName": "First Term",
        "studentsEnrolled": 1245,
        "assessmentsCompleted": 156,
        "attendanceRate": 96.2,
        "averageScore": 81.2
      },
      {
        "termId": "term_002",
        "termName": "Second Term",
        "studentsEnrolled": 1250,
        "assessmentsCompleted": 89,
        "attendanceRate": 94.8,
        "averageScore": 79.1
      }
    ]
  }
}
```

---

## 6. General Settings

### 6.1 Get School Configuration
**Endpoint:** `GET /api/settings/school-config`

**Description:** Get general school configuration settings

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "schoolName": "Greenwood High School",
    "schoolCode": "GHS",
    "schoolAddress": {
      "street": "123 Education Lane",
      "city": "Lagos",
      "state": "Lagos State",
      "country": "Nigeria",
      "postalCode": "100001"
    },
    "contactInfo": {
      "phone": "+234-800-123-4567",
      "email": "info@greenwood.edu.ng",
      "website": "www.greenwood.edu.ng"
    },
    "academicSettings": {
      "gradingSystem": "PERCENTAGE",
      "passMark": 50,
      "maxScore": 100,
      "attendanceThreshold": 75
    },
    "systemSettings": {
      "timezone": "Africa/Lagos",
      "dateFormat": "DD/MM/YYYY",
      "currency": "NGN",
      "language": "en"
    }
  }
}
```

### 6.2 Update School Configuration
**Endpoint:** `PUT /api/settings/school-config`

**Description:** Update school configuration settings

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "schoolName": "Greenwood International School",
  "academicSettings": {
    "gradingSystem": "LETTER_GRADE",
    "passMark": 60,
    "maxScore": 100,
    "attendanceThreshold": 80
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "School configuration updated successfully",
  "data": {
    "updatedFields": [
      "schoolName",
      "academicSettings.gradingSystem",
      "academicSettings.passMark",
      "academicSettings.attendanceThreshold"
    ],
    "updatedAt": "2024-08-02T21:50:26Z"
  }
}
```

---

## 7. Settings Dashboard & Analytics

### 7.1 Get Settings Dashboard
**Endpoint:** `GET /api/settings/dashboard`

**Description:** Get comprehensive settings dashboard data

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalDepartments": 4,
      "totalAcademicLevels": 6,
      "totalClassrooms": 31,
      "activeSessions": 1
    },
    "recentActivities": [
      {
        "id": "activity_001",
        "type": "DEPARTMENT_CREATED",
        "description": "Technology department created",
        "performedBy": {
          "id": "admin_001",
          "name": "John Admin"
        },
        "timestamp": "2024-08-02T21:45:00Z"
      }
    ],
    "systemHealth": {
      "configurationStatus": "HEALTHY",
      "dataIntegrity": "GOOD",
      "lastBackup": "2024-08-02T20:00:00Z",
      "pendingMigrations": 0
    },
    "quickActions": [
      {
        "action": "ADD_DEPARTMENT",
        "label": "Add New Department",
        "endpoint": "/api/settings/departments"
      },
      {
        "action": "ADD_ACADEMIC_LEVEL",
        "label": "Add Academic Level",
        "endpoint": "/api/settings/academic-levels"
      }
    ]
  }
}
```

---

## 8. Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "name",
        "message": "Department name is required"
      },
      {
        "field": "code",
        "message": "Department code must be unique"
      }
    ]
  }
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You don't have permission to access this resource"
  }
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Department not found"
  }
}
```

#### 409 Conflict
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "Cannot delete department with active students"
  }
}
```

---

## 9. Caching Strategy

### Cache Keys and TTL
- **Departments List:** `settings:departments:list` - 30 minutes
- **Academic Levels:** `settings:levels:list` - 1 hour
- **School Config:** `settings:school:config` - 24 hours
- **Department Details:** `settings:department:{id}` - 15 minutes
- **Level Details:** `settings:level:{id}` - 15 minutes

### Cache Invalidation
- Department operations invalidate: `settings:departments:*`
- Academic level operations invalidate: `settings:levels:*`
- School config updates invalidate: `settings:school:*`

---

## 10. Rate Limiting

### Endpoints Rate Limits
- **GET requests:** 100 requests per minute
- **POST/PUT requests:** 20 requests per minute
- **DELETE requests:** 5 requests per minute
- **Bulk operations:** 3 requests per minute

---

## 11. Integration Points

### 11.1 Department Integration
- **Users Service:** HOD assignment and management
- **Subjects Service:** Department-subject relationships
- **Students Service:** Student department assignment
- **Teachers Service:** Teacher department assignment

### 11.2 Academic Levels Integration
- **Students Service:** Student level assignment and progression
- **Assessments Service:** Level-based assessment structures
- **Attendance Service:** Level-based attendance tracking
- **Timetable Service:** Level-based scheduling

### 11.3 Academic Sessions Integration
- **Assessments Service:** Session-term based assessments
- **Attendance Service:** Session-based attendance records
- **Financial Service:** Fee structure per session
- **Reports Service:** Session-based reporting

---

## 12. Webhooks and Events

### Department Events
- `department.created`
- `department.updated`
- `department.deleted`
- `department.status_changed`

### Academic Level Events
- `academic_level.created`
- `academic_level.updated`
- `academic_level.deleted`
- `academic_level.reordered`

### Academic Session Events
- `academic_session.created`
- `academic_session.activated`
- `academic_session.completed`
- `term.started`
- `term.ended`

### School Configuration Events
- `school_config.updated`
- `grading_system.changed`
- `academic_calendar.updated`

---

## 13. Audit Trail

All settings modifications are logged with:
- **User ID:** Who made the change
- **Timestamp:** When the change occurred
- **Action Type:** What was changed
- **Old Values:** Previous state
- **New Values:** Current state
- **IP Address:** Source of the request
- **User Agent:** Client information

**Audit Log Endpoint:** `GET /api/settings/audit-logs`

---

This API specification covers the comprehensive settings management system including departments, academic levels, academic sessions, and general school configurations as shown in the UI screenshot.
