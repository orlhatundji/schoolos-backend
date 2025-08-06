# Subjects API Endpoint Specifications

Based on the Saint James Admin Portal Subjects UI, here are the required API endpoints:

## 1. Subjects Overview Statistics

### GET /api/subjects/overview
**Description**: Get overall subjects statistics and summary metrics

**Response**:
```json
{
  "statistics": {
    "totalSubjects": {
      "count": 10,
      "breakdown": {
        "active": 9,
        "inactive": 1
      },
      "description": "9 active, 1 inactive"
    },
    "totalStudents": {
      "count": 1595,
      "description": "Across all subjects"
    },
    "totalClasses": {
      "count": 64,
      "description": "Subject classes running"
    },
    "categories": {
      "core": {
        "count": 5,
        "label": "Core",
        "color": "blue"
      },
      "elective": {
        "count": 3,
        "label": "Elective", 
        "color": "green"
      },
      "vocational": {
        "count": 2,
        "label": "Vocational",
        "color": "purple"
      }
    }
  }
}
```

## 2. Subjects List with Pagination

### GET /api/subjects
**Description**: Get paginated list of all subjects with detailed information

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term for subject name or code
- `department` (optional): Filter by department ("Science", "Languages", "Technology", "Arts", "Vocational")
- `category` (optional): Filter by category ("core", "elective", "vocational")
- `status` (optional): Filter by status ("active", "inactive")
- `sortBy` (optional): Sort field ("name", "department", "students", "classes", "category")
- `sortOrder` (optional): "asc" | "desc" (default: "asc")

**Response**:
```json
{
  "subjects": [
    {
      "id": "subj_001",
      "serialNumber": 1,
      "name": "Mathematics",
      "code": "MTH",
      "department": {
        "id": "dept_science",
        "name": "Science"
      },
      "category": {
        "type": "core",
        "label": "Core",
        "badge": {
          "text": "Core",
          "color": "blue",
          "backgroundColor": "#e3f2fd"
        }
      },
      "classes": {
        "count": 12,
        "label": "12 classes",
        "classArms": [
          {
            "id": "cls_jss1_alpha",
            "name": "JSS 1 Alpha",
            "level": "JSS 1"
          },
          {
            "id": "cls_jss1_ruby",
            "name": "JSS 1 Ruby", 
            "level": "JSS 1"
          },
          {
            "id": "cls_jss2_alpha",
            "name": "JSS 2 Alpha",
            "level": "JSS 2"
          }
        ]
      },
      "students": {
        "count": 350,
        "label": "350 students"
      },
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "teachers": [
        {
          "id": "tch_001",
          "name": "Mrs. Sarah Williams",
          "isPrimary": true
        },
        {
          "id": "tch_002", 
          "name": "Mr. John Doe",
          "isPrimary": false
        }
      ],
      "isElective": false,
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T10:00:00Z"
    },
    {
      "id": "subj_002",
      "serialNumber": 2,
      "name": "English Language",
      "code": "ENG",
      "department": {
        "id": "dept_languages",
        "name": "Languages"
      },
      "category": {
        "type": "core",
        "label": "Core",
        "badge": {
          "text": "Core",
          "color": "blue",
          "backgroundColor": "#e3f2fd"
        }
      },
      "classes": {
        "count": 10,
        "label": "10 classes",
        "classArms": [
          {
            "id": "cls_jss1_alpha",
            "name": "JSS 1 Alpha",
            "level": "JSS 1"
          },
          {
            "id": "cls_jss2_ruby",
            "name": "JSS 2 Ruby",
            "level": "JSS 2"
          }
        ]
      },
      "students": {
        "count": 380,
        "label": "380 students"
      },
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "teachers": [
        {
          "id": "tch_003",
          "name": "Mrs. Grace Johnson",
          "isPrimary": true
        }
      ],
      "isElective": false,
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T09:30:00Z"
    },
    {
      "id": "subj_003",
      "serialNumber": 3,
      "name": "Biology",
      "code": "BIO",
      "department": {
        "id": "dept_science",
        "name": "Science"
      },
      "category": {
        "type": "core",
        "label": "Core",
        "badge": {
          "text": "Core",
          "color": "blue",
          "backgroundColor": "#e3f2fd"
        }
      },
      "classes": {
        "count": 8,
        "label": "8 classes",
        "classArms": [
          {
            "id": "cls_ss1_gold",
            "name": "SS 1 Gold",
            "level": "SS 1"
          },
          {
            "id": "cls_ss2_diamond",
            "name": "SS 2 Diamond",
            "level": "SS 2"
          }
        ]
      },
      "students": {
        "count": 200,
        "label": "200 students"
      },
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "teachers": [
        {
          "id": "tch_004",
          "name": "Dr. David Chen",
          "isPrimary": true
        }
      ],
      "isElective": false,
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T09:45:00Z"
    },
    {
      "id": "subj_004",
      "serialNumber": 4,
      "name": "Physics",
      "code": "PHY",
      "department": {
        "id": "dept_science",
        "name": "Science"
      },
      "category": {
        "type": "core",
        "label": "Core",
        "badge": {
          "text": "Core",
          "color": "blue",
          "backgroundColor": "#e3f2fd"
        }
      },
      "classes": {
        "count": 6,
        "label": "6 classes",
        "classArms": [
          {
            "id": "cls_ss1_gold",
            "name": "SS 1 Gold",
            "level": "SS 1"
          },
          {
            "id": "cls_ss2_phoenix",
            "name": "SS 2 Phoenix",
            "level": "SS 2"
          }
        ]
      },
      "students": {
        "count": 150,
        "label": "150 students"
      },
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "teachers": [
        {
          "id": "tch_005",
          "name": "Prof. Grace Stanford",
          "isPrimary": true
        }
      ],
      "isElective": false,
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T09:15:00Z"
    },
    {
      "id": "subj_005",
      "serialNumber": 5,
      "name": "Chemistry",
      "code": "CHE",
      "department": {
        "id": "dept_science",
        "name": "Science"
      },
      "category": {
        "type": "core",
        "label": "Core",
        "badge": {
          "text": "Core",
          "color": "blue",
          "backgroundColor": "#e3f2fd"
        }
      },
      "classes": {
        "count": 6,
        "label": "6 classes",
        "classArms": [
          {
            "id": "cls_ss1_silver",
            "name": "SS 1 Silver",
            "level": "SS 1"
          },
          {
            "id": "cls_ss3_emerald",
            "name": "SS 3 Emerald",
            "level": "SS 3"
          }
        ]
      },
      "students": {
        "count": 140,
        "label": "140 students"
      },
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "teachers": [
        {
          "id": "tch_006",
          "name": "Dr. Michael Johnson",
          "isPrimary": true
        }
      ],
      "isElective": false,
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T08:30:00Z"
    },
    {
      "id": "subj_006",
      "serialNumber": 6,
      "name": "Computer Science",
      "code": "CSC",
      "department": {
        "id": "dept_technology",
        "name": "Technology"
      },
      "category": {
        "type": "elective",
        "label": "Elective",
        "badge": {
          "text": "Elective",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "classes": {
        "count": 4,
        "label": "4 classes",
        "classArms": [
          {
            "id": "cls_ss1_gold",
            "name": "SS 1 Gold",
            "level": "SS 1"
          },
          {
            "id": "cls_ss2_diamond",
            "name": "SS 2 Diamond",
            "level": "SS 2"
          }
        ]
      },
      "students": {
        "count": 80,
        "label": "80 students"
      },
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "teachers": [
        {
          "id": "tch_007",
          "name": "Mr. Robert Brown",
          "isPrimary": true
        }
      ],
      "isElective": true,
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T08:00:00Z"
    },
    {
      "id": "subj_007",
      "serialNumber": 7,
      "name": "Fine Arts",
      "code": "ART",
      "department": {
        "id": "dept_arts",
        "name": "Arts"
      },
      "category": {
        "type": "elective",
        "label": "Elective",
        "badge": {
          "text": "Elective",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "classes": {
        "count": 5,
        "label": "5 classes",
        "classArms": [
          {
            "id": "cls_jss1_alpha",
            "name": "JSS 1 Alpha",
            "level": "JSS 1"
          },
          {
            "id": "cls_jss2_ruby",
            "name": "JSS 2 Ruby",
            "level": "JSS 2"
          }
        ]
      },
      "students": {
        "count": 100,
        "label": "100 students"
      },
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "teachers": [
        {
          "id": "tch_008",
          "name": "Mrs. Jennifer Davis",
          "isPrimary": true
        }
      ],
      "isElective": true,
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T07:30:00Z"
    },
    {
      "id": "subj_008",
      "serialNumber": 8,
      "name": "Agricultural Science",
      "code": "AGR",
      "department": {
        "id": "dept_vocational",
        "name": "Vocational"
      },
      "category": {
        "type": "vocational",
        "label": "Vocational",
        "badge": {
          "text": "Vocational",
          "color": "purple",
          "backgroundColor": "#f3e5f5"
        }
      },
      "classes": {
        "count": 6,
        "label": "6 classes",
        "classArms": [
          {
            "id": "cls_jss3_emerald",
            "name": "JSS 3 Emerald",
            "level": "JSS 3"
          },
          {
            "id": "cls_ss1_silver",
            "name": "SS 1 Silver",
            "level": "SS 1"
          }
        ]
      },
      "students": {
        "count": 90,
        "label": "90 students"
      },
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "teachers": [
        {
          "id": "tch_009",
          "name": "Mr. Mark Wilson",
          "isPrimary": true
        }
      ],
      "isElective": true,
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T07:00:00Z"
    },
    {
      "id": "subj_009",
      "serialNumber": 9,
      "name": "French Language",
      "code": "FRE",
      "department": {
        "id": "dept_languages",
        "name": "Languages"
      },
      "category": {
        "type": "elective",
        "label": "Elective",
        "badge": {
          "text": "Elective",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "classes": {
        "count": 4,
        "label": "4 classes",
        "classArms": [
          {
            "id": "cls_ss1_gold",
            "name": "SS 1 Gold",
            "level": "SS 1"
          },
          {
            "id": "cls_ss2_phoenix",
            "name": "SS 2 Phoenix",
            "level": "SS 2"
          }
        ]
      },
      "students": {
        "count": 60,
        "label": "60 students"
      },
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "teachers": [
        {
          "id": "tch_010",
          "name": "Mme. Jennifer Davis",
          "isPrimary": true
        }
      ],
      "isElective": true,
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T06:30:00Z"
    },
    {
      "id": "subj_010",
      "serialNumber": 10,
      "name": "Technical Drawing",
      "code": "TDR",
      "department": {
        "id": "dept_technology",
        "name": "Technology"
      },
      "category": {
        "type": "vocational",
        "label": "Vocational",
        "badge": {
          "text": "Vocational",
          "color": "purple",
          "backgroundColor": "#f3e5f5"
        }
      },
      "classes": {
        "count": 3,
        "label": "3 classes",
        "classArms": [
          {
            "id": "cls_ss2_diamond",
            "name": "SS 2 Diamond",
            "level": "SS 2"
          },
          {
            "id": "cls_ss3_emerald",
            "name": "SS 3 Emerald",
            "level": "SS 3"
          }
        ]
      },
      "students": {
        "count": 45,
        "label": "45 students"
      },
      "status": {
        "current": "inactive",
        "label": "Inactive",
        "badge": {
          "text": "Inactive",
          "color": "red",
          "backgroundColor": "#ffebee"
        }
      },
      "teachers": [
        {
          "id": "tch_011",
          "name": "Mr. Thomas Anderson",
          "isPrimary": true
        }
      ],
      "isElective": true,
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T06:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 10,
    "itemsPerPage": 10,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "summary": {
    "totalSubjects": 10,
    "displayedRange": "1 to 10 of 10 subjects",
    "statusBreakdown": {
      "active": 9,
      "inactive": 1
    },
    "categoryBreakdown": {
      "core": 5,
      "elective": 3,
      "vocational": 2
    },
    "departmentBreakdown": {
      "Science": 4,
      "Languages": 2,
      "Technology": 2,
      "Arts": 1,
      "Vocational": 1
    },
    "totalStudentsEnrolled": 1595,
    "totalClassesRunning": 64
  }
}
```

## 3. Single Subject Details

### GET /api/subjects/{subjectId}
**Description**: Get detailed information about a specific subject

**Path Parameters**:
- `subjectId`: Unique identifier for the subject

**Response**:
```json
{
  "subject": {
    "id": "subj_001",
    "name": "Mathematics",
    "code": "MTH",
    "description": "Core mathematics curriculum covering algebra, geometry, statistics, and problem-solving",
    "department": {
      "id": "dept_science",
      "name": "Science",
      "hod": {
        "id": "tch_hod_001",
        "name": "Dr. Ahmed Bello"
      }
    },
    "category": {
      "type": "core",
      "label": "Core",
      "description": "Compulsory subject for all students"
    },
    "isElective": false,
    "prerequisites": [],
    "classArms": [
      {
        "id": "cls_jss1_alpha",
        "name": "JSS 1 Alpha",
        "level": "JSS 1",
        "studentCount": 28,
        "teacher": {
          "id": "tch_001",
          "name": "Mrs. Sarah Williams"
        },
        "schedule": {
          "periodsPerWeek": 5,
          "durationMinutes": 40
        }
      },
      {
        "id": "cls_jss1_ruby",
        "name": "JSS 1 Ruby",
        "level": "JSS 1",
        "studentCount": 26,
        "teacher": {
          "id": "tch_002",
          "name": "Mr. John Doe"
        },
        "schedule": {
          "periodsPerWeek": 5,
          "durationMinutes": 40
        }
      }
    ],
    "teachers": [
      {
        "id": "tch_001",
        "name": "Mrs. Sarah Williams",
        "isPrimary": true,
        "classesCount": 6,
        "studentsCount": 180
      },
      {
        "id": "tch_002",
        "name": "Mr. John Doe",
        "isPrimary": false,
        "classesCount": 6,
        "studentsCount": 170
      }
    ],
    "curriculum": {
      "totalTopics": 24,
      "completedTopics": 18,
      "progressPercentage": 75.0,
      "currentTopic": "Quadratic Equations"
    },
    "performance": {
      "averageScore": 72.5,
      "passRate": 85.7,
      "topPerformingClass": "JSS 1 Alpha",
      "improvementNeeded": ["Geometry", "Word Problems"]
    },
    "resources": {
      "textbooks": [
        {
          "title": "New General Mathematics",
          "author": "M.F. Macrae",
          "isbn": "978-0582236"
        }
      ],
      "onlineResources": [
        {
          "name": "Khan Academy Mathematics",
          "url": "https://khanacademy.org/math"
        }
      ]
    },
    "assessments": {
      "totalAssessments": 12,
      "upcomingAssessments": 2,
      "lastAssessment": {
        "name": "First Term Test",
        "date": "2025-07-15",
        "averageScore": 68.5
      }
    },
    "status": {
      "current": "active",
      "lastChanged": "2024-09-01T00:00:00Z",
      "changedBy": "admin_001"
    },
    "createdAt": "2024-09-01T00:00:00Z",
    "updatedAt": "2025-08-02T10:00:00Z"
  }
}
```

## 4. Create New Subject

### POST /api/subjects
**Description**: Create a new subject

**Request Body**:
```json
{
  "name": "Economics",
  "code": "ECO",
  "description": "Introduction to economic principles and concepts",
  "departmentId": "dept_social_sciences",
  "category": "elective",
  "isElective": true,
  "prerequisites": ["subj_001"],
  "textbooks": [
    {
      "title": "Principles of Economics",
      "author": "N. Gregory Mankiw",
      "isbn": "978-1305585126"
    }
  ],
  "weeklyPeriods": 4,
  "periodDurationMinutes": 40
}
```

**Response**:
```json
{
  "success": true,
  "message": "Subject created successfully",
  "subject": {
    "id": "subj_011",
    "name": "Economics",
    "code": "ECO",
    "department": {
      "id": "dept_social_sciences",
      "name": "Social Sciences"
    },
    "category": "elective",
    "status": "active",
    "createdAt": "2025-08-02T15:30:00Z"
  }
}
```

## 5. Update Subject

### PUT /api/subjects/{subjectId}
**Description**: Update subject information

**Path Parameters**:
- `subjectId`: Unique identifier for the subject

**Request Body**:
```json
{
  "name": "Advanced Mathematics",
  "description": "Updated curriculum with calculus introduction",
  "departmentId": "dept_science",
  "category": "core",
  "weeklyPeriods": 6
}
```

**Response**:
```json
{
  "success": true,
  "message": "Subject updated successfully",
  "subject": {
    "id": "subj_001",
    "updatedAt": "2025-08-02T15:45:00Z"
  }
}
```

## 6. Subject Class Assignment

### POST /api/subjects/{subjectId}/classes
**Description**: Assign class arms to a subject

**Path Parameters**:
- `subjectId`: Unique identifier for the subject

**Request Body**:
```json
{
  "classArmIds": ["cls_jss1_alpha", "cls_jss2_ruby"],
  "teacherId": "tch_001",
  "effectiveDate": "2025-08-03"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Classes assigned successfully",
  "assignments": [
    {
      "classArmId": "cls_jss1_alpha",
      "className": "JSS 1 Alpha",
      "teacherId": "tch_001",
      "teacherName": "Mrs. Sarah Williams",
      "assignedDate": "2025-08-03T00:00:00Z"
    }
  ]
}
```

## 7. Subject Teacher Assignment

### POST /api/subjects/{subjectId}/teachers
**Description**: Assign teachers to a subject

**Path Parameters**:
- `subjectId`: Unique identifier for the subject

**Request Body**:
```json
{
  "teacherId": "tch_001",
  "isPrimary": true,
  "classArmIds": ["cls_jss1_alpha", "cls_jss2_ruby"],
  "effectiveDate": "2025-08-03"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Teacher assigned successfully",
  "assignment": {
    "teacherId": "tch_001",
    "teacherName": "Mrs. Sarah Williams",
    "isPrimary": true,
    "classesAssigned": 2,
    "assignedDate": "2025-08-03T00:00:00Z"
  }
}
```

## 8. Subject Performance Analytics

### GET /api/subjects/{subjectId}/analytics
**Description**: Get subject performance analytics and insights

**Path Parameters**:
- `subjectId`: Unique identifier for the subject

**Query Parameters**:
- `period` (optional): "current_term" | "current_session" | "last_year"
- `classArmId` (optional): Filter by specific class arm

**Response**:
```json
{
  "analytics": {
    "overview": {
      "totalStudents": 350,
      "averageScore": 72.5,
      "passRate": 85.7,
      "failRate": 14.3,
      "improvementRate": 12.3
    },
    "classPerformance": [
      {
        "classArmId": "cls_jss1_alpha",
        "className": "JSS 1 Alpha",
        "studentCount": 28,
        "averageScore": 78.2,
        "passRate": 92.9,
        "rank": 1
      },
      {
        "classArmId": "cls_jss1_ruby", 
        "className": "JSS 1 Ruby",
        "studentCount": 26,
        "averageScore": 74.1,
        "passRate": 88.5,
        "rank": 2
      }
    ],
    "topicPerformance": [
      {
        "topic": "Algebra",
        "averageScore": 82.1,
        "difficulty": "Easy",
        "completionRate": 95.2
      },
      {
        "topic": "Geometry",
        "averageScore": 65.8,
        "difficulty": "Hard",
        "completionRate": 78.3
      }
    ],
    "trends": {
      "scoreImprovement": 8.5,
      "attendanceRate": 94.2,
      "engagementLevel": "High"
    },
    "recommendations": [
      {
        "area": "Geometry",
        "suggestion": "Increase practical exercises and visual aids",
        "priority": "High"
      },
      {
        "area": "Assessment Frequency",
        "suggestion": "Consider more frequent quizzes for better retention",
        "priority": "Medium"
      }
    ]
  }
}
```

## 9. Subject Curriculum Management

### GET /api/subjects/{subjectId}/curriculum
**Description**: Get subject curriculum details

**Path Parameters**:
- `subjectId`: Unique identifier for the subject

**Response**:
```json
{
  "curriculum": {
    "id": "curr_001",
    "subjectId": "subj_001",
    "totalWeeks": 36,
    "completedWeeks": 27,
    "progressPercentage": 75.0,
    "units": [
      {
        "id": "unit_001",
        "title": "Number Systems",
        "weekNumber": 1,
        "duration": 3,
        "status": "completed",
        "topics": [
          {
            "id": "topic_001",
            "title": "Natural Numbers",
            "completed": true,
            "assessmentScore": 78.5
          },
          {
            "id": "topic_002",
            "title": "Integers",
            "completed": true,
            "assessmentScore": 82.1
          }
        ]
      },
      {
        "id": "unit_002",
        "title": "Algebra",
        "weekNumber": 4,
        "duration": 4,
        "status": "in_progress",
        "topics": [
          {
            "id": "topic_003",
            "title": "Linear Equations",
            "completed": true,
            "assessmentScore": 75.3
          },
          {
            "id": "topic_004",
            "title": "Quadratic Equations",
            "completed": false,
            "assessmentScore": null
          }
        ]
      }
    ]
  }
}
```

## 10. Search and Filter Options

### GET /api/subjects/filters
**Description**: Get available filter options for subjects

**Response**:
```json
{
  "departments": [
    { "id": "dept_science", "name": "Science", "subjectCount": 4 },
    { "id": "dept_languages", "name": "Languages", "subjectCount": 2 },
    { "id": "dept_technology", "name": "Technology", "subjectCount": 2 },
    { "id": "dept_arts", "name": "Arts", "subjectCount": 1 },
    { "id": "dept_vocational", "name": "Vocational", "subjectCount": 1 }
  ],
  "categories": [
    { "type": "core", "label": "Core", "count": 5 },
    { "type": "elective", "label": "Elective", "count": 3 },
    { "type": "vocational", "label": "Vocational", "count": 2 }
  ],
  "statuses": [
    { "status": "active", "label": "Active", "count": 9 },
    { "status": "inactive", "label": "Inactive", "count": 1 }
  ],
  "levels": [
    { "level": "JSS", "label": "Junior Secondary", "subjectCount": 8 },
    { "level": "SS", "label": "Senior Secondary", "subjectCount": 7 }
  ]
}
```

## Error Responses

All endpoints should return consistent error responses:

```json
{
  "error": {
    "code": "SUBJECT_NOT_FOUND",
    "message": "Subject with ID 'subj_999' not found.",
    "details": {
      "subjectId": "subj_999"
    }
  }
}
```

## Security & Authentication

- All endpoints require authentication via JWT token
- Admin role required for create/update/delete operations
- Teachers can view subjects they are assigned to teach
- Department HODs can manage subjects in their department
- Rate limiting: 100 requests per minute per user
- Input validation for all POST/PUT requests
- Subject code uniqueness validation

## Caching Strategy

- Subjects overview: Cache for 15 minutes
- Subjects list: Cache for 10 minutes
- Single subject details: Cache for 20 minutes
- Subject analytics: Cache for 1 hour
- Subject curriculum: Cache for 30 minutes
- Filter options: Cache for 2 hours

## Additional Features

### GET /api/subjects/export
**Description**: Export subjects data to Excel/CSV

**Query Parameters**:
- `format`: "excel" | "csv"
- `filters`: Same as subjects list filters

### GET /api/subjects/bulk-operations
**Description**: Get bulk operation templates

**Response**:
```json
{
  "operations": [
    {
      "name": "Bulk Subject Creation",
      "description": "Create multiple subjects at once",
      "template": "/templates/bulk-subjects-create.csv"
    },
    {
      "name": "Bulk Teacher Assignment",
      "description": "Assign teachers to multiple subjects",
      "template": "/templates/bulk-teacher-assignment.csv"
    }
  ]
}
```

### GET /api/subjects/reports
**Description**: Generate various subject reports

**Query Parameters**:
- `type`: "performance" | "enrollment" | "curriculum_progress"
- `format`: "pdf" | "excel"
- `period`: Date range or academic period

## Integration with Prisma Schema

These endpoints integrate with the following Prisma models:

- **Subject**: Core subject information
- **Department**: Departmental organization
- **ClassArmSubjectTeacher**: Teacher-subject-class assignments
- **SubjectTerm**: Subject offerings per term
- **Curriculum**: Subject curriculum structure
- **CurriculumItem**: Individual curriculum topics
- **SubjectTermStudent**: Student enrollment and performance
- **School**: Multi-school support
- **AcademicSession**: Session and term context

The API ensures proper relationships and data integrity while providing comprehensive subject management capabilities.
