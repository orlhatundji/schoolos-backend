# Teachers API Endpoint Specifications

Based on the Saint James Admin Portal Teachers UI, here are the required API endpoints:

## 1. Teachers Overview Statistics

### GET /api/teachers/overview
**Description**: Get overall teacher statistics and summary metrics

**Response**:
```json
{
  "statistics": {
    "totalTeachers": {
      "count": 20,
      "description": "Across all departments"
    },
    "activeTeachers": {
      "count": 16,
      "description": "Currently teaching"
    },
    "inactive": {
      "count": 2,
      "description": "Currently inactive"
    },
    "onLeave": {
      "count": 2,
      "description": "Currently on leave"
    }
  }
}
```

## 2. Teachers List with Pagination

### GET /api/teachers
**Description**: Get paginated list of all teachers with detailed information

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term for teacher name, email, or subjects
- `department` (optional): Filter by department
- `status` (optional): Filter by status ("active", "inactive", "on_leave")
- `employment` (optional): Filter by employment type ("full-time", "part-time", "contract")
- `sortBy` (optional): Sort field ("name", "experience", "department", "status")
- `sortOrder` (optional): "asc" | "desc" (default: "asc")

**Response**:
```json
{
  "teachers": [
    {
      "id": "tch_001",
      "serialNumber": 1,
      "user": {
        "id": "usr_001",
        "firstName": "Sarah",
        "lastName": "Williams",
        "email": "sarah.williams@school.edu",
        "avatar": "/avatars/sarah_williams.jpg"
      },
      "teacherNo": "TCH001",
      "initials": "SW",
      "department": {
        "id": "dept_math",
        "name": "Mathematics"
      },
      "subjects": [
        {
          "id": "subj_001",
          "name": "Mathematics"
        },
        {
          "id": "subj_002",
          "name": "Further Mathematics"
        }
      ],
      "employment": {
        "type": "full-time",
        "status": "active",
        "startDate": "2017-09-01",
        "badge": {
          "text": "Full-time",
          "color": "blue",
          "backgroundColor": "#e3f2fd"
        }
      },
      "experience": {
        "years": 8,
        "label": "8 years"
      },
      "classes": {
        "count": 2,
        "label": "2 classes",
        "classArms": [
          {
            "id": "cls_001",
            "name": "JSS 1 Alpha"
          },
          {
            "id": "cls_002",
            "name": "JSS 2 Beta"
          }
        ]
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
      "createdAt": "2017-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T10:00:00Z"
    },
    {
      "id": "tch_002",
      "serialNumber": 2,
      "user": {
        "id": "usr_002",
        "firstName": "Michael",
        "lastName": "Johnson",
        "email": "michael.johnson@school.edu",
        "avatar": "/avatars/michael_johnson.jpg"
      },
      "teacherNo": "TCH002",
      "initials": "MJ",
      "department": {
        "id": "dept_english",
        "name": "English"
      },
      "subjects": [
        {
          "id": "subj_003",
          "name": "English Language"
        },
        {
          "id": "subj_004",
          "name": "Literature"
        }
      ],
      "employment": {
        "type": "full-time",
        "status": "active",
        "startDate": "2013-09-01",
        "badge": {
          "text": "Full-time",
          "color": "blue",
          "backgroundColor": "#e3f2fd"
        }
      },
      "experience": {
        "years": 12,
        "label": "12 years"
      },
      "classes": {
        "count": 2,
        "label": "2 classes",
        "classArms": [
          {
            "id": "cls_003",
            "name": "SS 1 Gold"
          },
          {
            "id": "cls_004",
            "name": "SS 2 Diamond"
          }
        ]
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
      "createdAt": "2013-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T09:30:00Z"
    },
    {
      "id": "tch_003",
      "serialNumber": 3,
      "user": {
        "id": "usr_003",
        "firstName": "Grace",
        "lastName": "Stanford",
        "email": "grace.stanford@school.edu",
        "avatar": "/avatars/grace_stanford.jpg"
      },
      "teacherNo": "TCH003",
      "initials": "GS",
      "department": {
        "id": "dept_science",
        "name": "Science"
      },
      "subjects": [
        {
          "id": "subj_005",
          "name": "Physics"
        },
        {
          "id": "subj_006",
          "name": "Chemistry"
        }
      ],
      "employment": {
        "type": "full-time",
        "status": "active",
        "startDate": "2019-09-01",
        "badge": {
          "text": "Full-time",
          "color": "blue",
          "backgroundColor": "#e3f2fd"
        }
      },
      "experience": {
        "years": 6,
        "label": "6 years"
      },
      "classes": {
        "count": 2,
        "label": "2 classes",
        "classArms": [
          {
            "id": "cls_005",
            "name": "JSS 3 Ruby"
          },
          {
            "id": "cls_006",
            "name": "SS 3 Emerald"
          }
        ]
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
      "createdAt": "2019-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T09:45:00Z"
    },
    {
      "id": "tch_004",
      "serialNumber": 4,
      "user": {
        "id": "usr_004",
        "firstName": "David",
        "lastName": "Chen",
        "email": "david.chen@school.edu",
        "avatar": "/avatars/david_chen.jpg"
      },
      "teacherNo": "TCH004",
      "initials": "DC",
      "department": {
        "id": "dept_science",
        "name": "Science"
      },
      "subjects": [
        {
          "id": "subj_007",
          "name": "Biology"
        },
        {
          "id": "subj_008",
          "name": "Agricultural Science"
        }
      ],
      "employment": {
        "type": "full-time",
        "status": "active",
        "startDate": "2015-09-01",
        "badge": {
          "text": "Full-time",
          "color": "blue",
          "backgroundColor": "#e3f2fd"
        }
      },
      "experience": {
        "years": 10,
        "label": "10 years"
      },
      "classes": {
        "count": 2,
        "label": "2 classes",
        "classArms": [
          {
            "id": "cls_007",
            "name": "JSS 2 Diamond"
          },
          {
            "id": "cls_008",
            "name": "SS 1 Silver"
          }
        ]
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
      "createdAt": "2015-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T09:15:00Z"
    },
    {
      "id": "tch_005",
      "serialNumber": 5,
      "user": {
        "id": "usr_005",
        "firstName": "Lisa",
        "lastName": "Anderson",
        "email": "lisa.anderson@school.edu",
        "avatar": "/avatars/lisa_anderson.jpg"
      },
      "teacherNo": "TCH005",
      "initials": "LA",
      "department": {
        "id": "dept_social",
        "name": "Social Sciences"
      },
      "subjects": [
        {
          "id": "subj_009",
          "name": "Geography"
        },
        {
          "id": "subj_010",
          "name": "Government"
        }
      ],
      "employment": {
        "type": "part-time",
        "status": "active",
        "startDate": "2021-09-01",
        "badge": {
          "text": "Part-time",
          "color": "purple",
          "backgroundColor": "#f3e5f5"
        }
      },
      "experience": {
        "years": 4,
        "label": "4 years"
      },
      "classes": {
        "count": 1,
        "label": "1 class",
        "classArms": [
          {
            "id": "cls_009",
            "name": "JSS 1 Alpha"
          }
        ]
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
      "createdAt": "2021-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T08:30:00Z"
    },
    {
      "id": "tch_006",
      "serialNumber": 6,
      "user": {
        "id": "usr_006",
        "firstName": "Robert",
        "lastName": "Brown",
        "email": "robert.brown@school.edu",
        "avatar": "/avatars/robert_brown.jpg"
      },
      "teacherNo": "TCH006",
      "initials": "RB",
      "department": {
        "id": "dept_arts",
        "name": "Arts"
      },
      "subjects": [
        {
          "id": "subj_011",
          "name": "Fine Arts"
        },
        {
          "id": "subj_012",
          "name": "Cultural Studies"
        }
      ],
      "employment": {
        "type": "contract",
        "status": "on_leave",
        "startDate": "2010-09-01",
        "badge": {
          "text": "Contract",
          "color": "orange",
          "backgroundColor": "#fff3e0"
        }
      },
      "experience": {
        "years": 15,
        "label": "15 years"
      },
      "classes": {
        "count": 1,
        "label": "1 class",
        "classArms": [
          {
            "id": "cls_010",
            "name": "JSS 3 Sapphire"
          }
        ]
      },
      "status": {
        "current": "on_leave",
        "label": "On leave",
        "badge": {
          "text": "On leave",
          "color": "yellow",
          "backgroundColor": "#fff8e1"
        }
      },
      "createdAt": "2010-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T08:00:00Z"
    },
    {
      "id": "tch_007",
      "serialNumber": 7,
      "user": {
        "id": "usr_007",
        "firstName": "Jennifer",
        "lastName": "Davis",
        "email": "jennifer.davis@school.edu",
        "avatar": "/avatars/jennifer_davis.jpg"
      },
      "teacherNo": "TCH007",
      "initials": "JD",
      "department": {
        "id": "dept_languages",
        "name": "Languages"
      },
      "subjects": [
        {
          "id": "subj_013",
          "name": "French"
        },
        {
          "id": "subj_014",
          "name": "Yoruba"
        }
      ],
      "employment": {
        "type": "full-time",
        "status": "active",
        "startDate": "2018-09-01",
        "badge": {
          "text": "Full-time",
          "color": "blue",
          "backgroundColor": "#e3f2fd"
        }
      },
      "experience": {
        "years": 7,
        "label": "7 years"
      },
      "classes": {
        "count": 2,
        "label": "2 classes",
        "classArms": [
          {
            "id": "cls_011",
            "name": "SS 1 Gold"
          },
          {
            "id": "cls_012",
            "name": "SS 2 Phoenix"
          }
        ]
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
      "createdAt": "2018-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T07:30:00Z"
    },
    {
      "id": "tch_008",
      "serialNumber": 8,
      "user": {
        "id": "usr_008",
        "firstName": "Mark",
        "lastName": "Wilson",
        "email": "mark.wilson@school.edu",
        "avatar": "/avatars/mark_wilson.jpg"
      },
      "teacherNo": "TCH008",
      "initials": "MW",
      "department": {
        "id": "dept_physical",
        "name": "Physical Education"
      },
      "subjects": [
        {
          "id": "subj_015",
          "name": "Physical Education"
        },
        {
          "id": "subj_016",
          "name": "Health Education"
        }
      ],
      "employment": {
        "type": "full-time",
        "status": "inactive",
        "startDate": "2020-09-01",
        "badge": {
          "text": "Full-time",
          "color": "blue",
          "backgroundColor": "#e3f2fd"
        }
      },
      "experience": {
        "years": 5,
        "label": "5 years"
      },
      "classes": {
        "count": 0,
        "label": "None",
        "classArms": []
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
      "createdAt": "2020-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T07:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 20,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "summary": {
    "totalTeachers": 20,
    "displayedRange": "1 to 10 of 20 teachers",
    "statusBreakdown": {
      "active": 16,
      "inactive": 2,
      "onLeave": 2
    },
    "employmentBreakdown": {
      "fullTime": 15,
      "partTime": 3,
      "contract": 2
    },
    "departmentBreakdown": {
      "Mathematics": 3,
      "Science": 4,
      "English": 2,
      "Arts": 2,
      "Languages": 3,
      "Physical Education": 2,
      "Social Sciences": 4
    }
  }
}
```

## 3. Single Teacher Details

### GET /api/teachers/{teacherId}
**Description**: Get detailed information about a specific teacher

**Path Parameters**:
- `teacherId`: Unique identifier for the teacher

**Response**:
```json
{
  "teacher": {
    "id": "tch_001",
    "user": {
      "id": "usr_001",
      "firstName": "Sarah",
      "lastName": "Williams",
      "email": "sarah.williams@school.edu",
      "phone": "+234-800-000-0001",
      "avatar": "/avatars/sarah_williams.jpg",
      "dateOfBirth": "1985-03-15",
      "address": {
        "street1": "123 Main Street",
        "city": "Lagos",
        "state": "Lagos State",
        "country": "Nigeria"
      }
    },
    "teacherNo": "TCH001",
    "department": {
      "id": "dept_math",
      "name": "Mathematics",
      "hod": {
        "id": "hod_001",
        "name": "Dr. Ahmed Bello"
      }
    },
    "employment": {
      "type": "full-time",
      "status": "active",
      "startDate": "2017-09-01",
      "endDate": null,
      "salary": {
        "amount": 150000,
        "currency": "NGN",
        "frequency": "monthly"
      },
      "contract": {
        "type": "permanent",
        "renewalDate": null
      }
    },
    "qualifications": [
      {
        "degree": "B.Sc Mathematics",
        "institution": "University of Lagos",
        "year": 2016
      },
      {
        "degree": "PGDE",
        "institution": "Lagos State University",
        "year": 2017
      }
    ],
    "subjects": [
      {
        "id": "subj_001",
        "name": "Mathematics",
        "level": "JSS/SS",
        "isPrimary": true
      },
      {
        "id": "subj_002",
        "name": "Further Mathematics",
        "level": "SS",
        "isPrimary": false
      }
    ],
    "classArms": [
      {
        "id": "cls_001",
        "name": "JSS 1 Alpha",
        "level": "JSS 1",
        "studentCount": 25,
        "role": "class_teacher"
      },
      {
        "id": "cls_002",
        "name": "JSS 2 Beta",
        "level": "JSS 2",
        "studentCount": 28,
        "role": "subject_teacher"
      }
    ],
    "performance": {
      "attendanceRate": 98.5,
      "studentSatisfactionRating": 4.7,
      "classAveragePerformance": 85.2,
      "lastEvaluation": {
        "date": "2025-06-15",
        "rating": "Excellent",
        "score": 4.8
      }
    },
    "schedule": {
      "totalPeriods": 20,
      "freePeriodsCount": 5,
      "weeklyHours": 25
    },
    "emergencyContact": {
      "name": "John Williams",
      "relationship": "Spouse",
      "phone": "+234-800-000-0002"
    },
    "createdAt": "2017-09-01T00:00:00Z",
    "updatedAt": "2025-08-02T10:00:00Z"
  }
}
```

## 4. Get Departments for Form Dropdowns

### GET /api/departments
**Description**: Get list of all departments for form dropdowns

**Response**:
```json
{
  "departments": [
    {
      "id": "dept_math",
      "name": "Mathematics",
      "code": "MATH",
      "hodName": "Dr. Ahmed Bello"
    },
    {
      "id": "dept_science",
      "name": "Science",
      "code": "SCI",
      "hodName": "Prof. Grace Adebayo"
    },
    {
      "id": "dept_english",
      "name": "English",
      "code": "ENG",
      "hodName": "Mrs. Faith Johnson"
    },
    {
      "id": "dept_social",
      "name": "Social Sciences",
      "code": "SSC",
      "hodName": "Mr. Tunde Okafor"
    },
    {
      "id": "dept_languages",
      "name": "Languages",
      "code": "LANG",
      "hodName": "Mme. Fatima Abdullahi"
    },
    {
      "id": "dept_arts",
      "name": "Arts",
      "code": "ARTS",
      "hodName": "Mr. Emeka Nwosu"
    },
    {
      "id": "dept_physical",
      "name": "Physical Education",
      "code": "PE",
      "hodName": "Coach Sarah Martins"
    }
  ]
}
```

## 5. Get Subjects for Form Multi-Select

### GET /api/subjects
**Description**: Get list of all subjects for teacher assignment

**Response**:
```json
{
  "subjects": [
    {
      "id": "subj_001",
      "name": "Mathematics",
      "code": "MATH",
      "department": {
        "id": "dept_math",
        "name": "Mathematics"
      },
      "level": "JSS/SS"
    },
    {
      "id": "subj_002",
      "name": "Further Mathematics",
      "code": "F_MATH",
      "department": {
        "id": "dept_math",
        "name": "Mathematics"
      },
      "level": "SS"
    },
    {
      "id": "subj_003",
      "name": "English Language",
      "code": "ENG_LANG",
      "department": {
        "id": "dept_english",
        "name": "English"
      },
      "level": "JSS/SS"
    },
    {
      "id": "subj_004",
      "name": "Literature in English",
      "code": "LIT",
      "department": {
        "id": "dept_english",
        "name": "English"
      },
      "level": "SS"
    },
    {
      "id": "subj_005",
      "name": "Physics",
      "code": "PHY",
      "department": {
        "id": "dept_science",
        "name": "Science"
      },
      "level": "SS"
    },
    {
      "id": "subj_006",
      "name": "Chemistry",
      "code": "CHEM",
      "department": {
        "id": "dept_science",
        "name": "Science"
      },
      "level": "SS"
    },
    {
      "id": "subj_007",
      "name": "Biology",
      "code": "BIO",
      "department": {
        "id": "dept_science",
        "name": "Science"
      },
      "level": "SS"
    },
    {
      "id": "subj_008",
      "name": "Agricultural Science",
      "code": "AGR_SCI",
      "department": {
        "id": "dept_science",
        "name": "Science"
      },
      "level": "JSS/SS"
    },
    {
      "id": "subj_009",
      "name": "Geography",
      "code": "GEO",
      "department": {
        "id": "dept_social",
        "name": "Social Sciences"
      },
      "level": "JSS/SS"
    },
    {
      "id": "subj_010",
      "name": "Government",
      "code": "GOV",
      "department": {
        "id": "dept_social",
        "name": "Social Sciences"
      },
      "level": "SS"
    },
    {
      "id": "subj_011",
      "name": "Economics",
      "code": "ECON",
      "department": {
        "id": "dept_social",
        "name": "Social Sciences"
      },
      "level": "SS"
    },
    {
      "id": "subj_012",
      "name": "History",
      "code": "HIST",
      "department": {
        "id": "dept_social",
        "name": "Social Sciences"
      },
      "level": "JSS/SS"
    },
    {
      "id": "subj_013",
      "name": "French Language",
      "code": "FRENCH",
      "department": {
        "id": "dept_languages",
        "name": "Languages"
      },
      "level": "JSS/SS"
    },
    {
      "id": "subj_014",
      "name": "Yoruba Language",
      "code": "YORUBA",
      "department": {
        "id": "dept_languages",
        "name": "Languages"
      },
      "level": "JSS/SS"
    },
    {
      "id": "subj_015",
      "name": "Hausa Language",
      "code": "HAUSA",
      "department": {
        "id": "dept_languages",
        "name": "Languages"
      },
      "level": "JSS/SS"
    },
    {
      "id": "subj_016",
      "name": "Igbo Language",
      "code": "IGBO",
      "department": {
        "id": "dept_languages",
        "name": "Languages"
      },
      "level": "JSS/SS"
    },
    {
      "id": "subj_017",
      "name": "Accounting",
      "code": "ACC",
      "department": {
        "id": "dept_social",
        "name": "Social Sciences"
      },
      "level": "SS"
    },
    {
      "id": "subj_018",
      "name": "Commerce",
      "code": "COM",
      "department": {
        "id": "dept_social",
        "name": "Social Sciences"
      },
      "level": "SS"
    }
  ]
}
```

## 6. Upload Teacher Profile Picture

### POST /api/teachers/upload-avatar
**Description**: Upload profile picture for a teacher

**Request**: Multipart form data
- `file`: Image file (max 5MB, square image recommended 200x200px minimum)
- `teacherId` (optional): If updating existing teacher, otherwise for new teacher creation

**Response**:
```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "avatar": {
    "url": "/uploads/avatars/teacher_12345.jpg",
    "filename": "teacher_12345.jpg",
    "size": 1024000,
    "mimeType": "image/jpeg"
  }
}
```

## 7. Create New Teacher

### POST /api/teachers
**Description**: Create a new teacher record based on the Add New Teacher form

**Request Body**:
```json
{
  "personalInformation": {
    "firstName": "John",
    "lastName": "Smith", 
    "email": "teacher@school.edu",
    "phoneNumber": "+234-XXX-XXX-XXXX"
  },
  "profilePicture": {
    "avatarUrl": "/uploads/avatars/teacher_12345.jpg"
  },
  "professionalInformation": {
    "departmentId": "dept_math",
    "employmentType": "full-time",
    "yearsOfExperience": 0,
    "joinDate": "2025-02-08",
    "qualification": "e.g., B.Sc Mathematics, M.Ed Education"
  },
  "subjectsToTeach": [
    "subj_001",
    "subj_002",
    "subj_005"
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Teacher created successfully",
  "teacher": {
    "id": "tch_021",
    "teacherNo": "TCH021",
    "user": {
      "id": "usr_021",
      "firstName": "John",
      "lastName": "Smith",
      "email": "teacher@school.edu",
      "phone": "+234-XXX-XXX-XXXX",
      "avatar": "/uploads/avatars/teacher_12345.jpg"
    },
    "department": {
      "id": "dept_math",
      "name": "Mathematics"
    },
    "employment": {
      "type": "full-time",
      "status": "active",
      "startDate": "2025-02-08",
      "experience": {
        "years": 0,
        "label": "0 years"
      }
    },
    "qualification": "e.g., B.Sc Mathematics, M.Ed Education",
    "subjects": [
      {
        "id": "subj_001",
        "name": "Mathematics"
      },
      {
        "id": "subj_002", 
        "name": "Further Mathematics"
      },
      {
        "id": "subj_005",
        "name": "Physics"
      }
    ],
    "status": "active",
    "createdAt": "2025-08-02T15:30:00Z"
  }
}
```

**Validation Rules**:
- Email must be unique across all users
- Phone number format validation
- Employment type must be one of: "full-time", "part-time", "contract"
- Years of experience must be >= 0
- Join date cannot be in the future
- At least one subject must be selected
- Department must be valid and active
- Profile picture size limit: 5MB
- Recommended image format: JPG, PNG
- Minimum image dimensions: 200x200px (square preferred)

## 8. Update Teacher

### PUT /api/teachers/{teacherId}
**Description**: Update teacher information

**Path Parameters**:
- `teacherId`: Unique identifier for the teacher

**Request Body**:
```json
{
  "user": {
    "phone": "+234-800-000-0025",
    "address": {
      "street1": "789 New Street",
      "city": "Abuja"
    }
  },
  "departmentId": "dept_science",
  "employment": {
    "type": "part-time",
    "salary": {
      "amount": 80000
    }
  },
  "subjectIds": ["subj_005", "subj_006"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Teacher updated successfully",
  "teacher": {
    "id": "tch_001",
    "updatedAt": "2025-08-02T15:45:00Z"
  }
}
```

## 9. Teacher Subject Assignment

### POST /api/teachers/{teacherId}/subjects
**Description**: Assign subjects to a teacher

**Path Parameters**:
- `teacherId`: Unique identifier for the teacher

**Request Body**:
```json
{
  "subjectIds": ["subj_001", "subj_002", "subj_003"],
  "effectiveDate": "2025-08-03"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Subjects assigned successfully",
  "assignments": [
    {
      "subjectId": "subj_001",
      "subjectName": "Mathematics",
      "assignedDate": "2025-08-03T00:00:00Z"
    }
  ]
}
```

## 10. Teacher Class Assignment

### POST /api/teachers/{teacherId}/classes
**Description**: Assign class arms to a teacher

**Path Parameters**:
- `teacherId`: Unique identifier for the teacher

**Request Body**:
```json
{
  "classArmId": "cls_001",
  "role": "class_teacher",
  "effectiveDate": "2025-08-03"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Class assigned successfully",
  "assignment": {
    "classArmId": "cls_001",
    "className": "JSS 1 Alpha",
    "role": "class_teacher",
    "assignedDate": "2025-08-03T00:00:00Z"
  }
}
```

## 11. Teacher Schedule

### GET /api/teachers/{teacherId}/schedule
**Description**: Get weekly schedule for a teacher

**Path Parameters**:
- `teacherId`: Unique identifier for the teacher

**Query Parameters**:
- `week` (optional): Specific week (ISO format, default: current week)

**Response**:
```json
{
  "schedule": {
    "monday": [
      {
        "period": 1,
        "time": "08:00-09:00",
        "subject": {
          "id": "subj_001",
          "name": "Mathematics"
        },
        "classArm": {
          "id": "cls_001",
          "name": "JSS 1 Alpha"
        },
        "room": "A101"
      }
    ],
    "tuesday": [],
    "wednesday": [],
    "thursday": [],
    "friday": []
  },
  "summary": {
    "totalPeriods": 20,
    "freePeriods": 5,
    "weeklyHours": 25,
    "classesCount": 3,
    "subjectsCount": 2
  }
}
```

## 12. Teacher Performance

### GET /api/teachers/{teacherId}/performance
**Description**: Get teacher performance metrics and evaluations

**Path Parameters**:
- `teacherId`: Unique identifier for the teacher

**Query Parameters**:
- `period` (optional): "current_term" | "current_session" | "last_year"

**Response**:
```json
{
  "performance": {
    "overall": {
      "rating": 4.7,
      "grade": "Excellent",
      "percentile": 85
    },
    "metrics": {
      "attendanceRate": 98.5,
      "punctualityRate": 96.8,
      "studentSatisfaction": 4.6,
      "classPerformance": 85.2,
      "professionalDevelopment": 4.8
    },
    "evaluations": [
      {
        "id": "eval_001",
        "date": "2025-06-15",
        "evaluator": "Dr. Principal",
        "type": "Annual Review",
        "rating": 4.8,
        "comments": "Excellent teaching methods and student engagement"
      }
    ],
    "achievements": [
      {
        "title": "Teacher of the Month",
        "date": "2025-07-01",
        "description": "Outstanding performance in July 2025"
      }
    ],
    "improvements": [
      {
        "area": "Technology Integration",
        "recommendation": "Attend digital teaching workshop",
        "priority": "medium"
      }
    ]
  }
}
```

## 13. Search and Filter Options

### GET /api/teachers/filters
**Description**: Get available filter options for teachers

**Response**:
```json
{
  "departments": [
    { "id": "dept_math", "name": "Mathematics", "teacherCount": 3 },
    { "id": "dept_science", "name": "Science", "teacherCount": 4 },
    { "id": "dept_english", "name": "English", "teacherCount": 2 },
    { "id": "dept_arts", "name": "Arts", "teacherCount": 2 },
    { "id": "dept_languages", "name": "Languages", "teacherCount": 3 },
    { "id": "dept_physical", "name": "Physical Education", "teacherCount": 2 },
    { "id": "dept_social", "name": "Social Sciences", "teacherCount": 4 }
  ],
  "employmentTypes": [
    { "type": "full-time", "label": "Full-time", "count": 15 },
    { "type": "part-time", "label": "Part-time", "count": 3 },
    { "type": "contract", "label": "Contract", "count": 2 }
  ],
  "statuses": [
    { "status": "active", "label": "Active", "count": 16 },
    { "status": "inactive", "label": "Inactive", "count": 2 },
    { "status": "on_leave", "label": "On Leave", "count": 2 }
  ],
  "experienceRanges": [
    { "range": "0-2", "label": "0-2 years", "count": 3 },
    { "range": "3-5", "label": "3-5 years", "count": 5 },
    { "range": "6-10", "label": "6-10 years", "count": 7 },
    { "range": "10+", "label": "10+ years", "count": 5 }
  ]
}
```

## Error Responses

All endpoints should return consistent error responses:

```json
{
  "error": {
    "code": "TEACHER_NOT_FOUND",
    "message": "Teacher with ID 'tch_999' not found.",
    "details": {
      "teacherId": "tch_999"
    }
  }
}
```

## Security & Authentication

- All endpoints require authentication via JWT token
- Admin role required for create/update/delete operations
- Teachers can view their own profile and limited information about colleagues
- Department HODs can manage teachers in their department
- Rate limiting: 100 requests per minute per user
- Input validation for all POST/PUT requests
- Email uniqueness validation
- Teacher number uniqueness validation

## Caching Strategy

- Teachers overview: Cache for 10 minutes
- Teachers list: Cache for 5 minutes
- Single teacher details: Cache for 15 minutes
- Teacher schedule: Cache for 1 hour
- Teacher performance: Cache for 30 minutes
- Filter options: Cache for 1 hour

## Additional Features

### GET /api/teachers/export
**Description**: Export teachers data to Excel/CSV

**Query Parameters**:
- `format`: "excel" | "csv"
- `filters`: Same as teachers list filters

### GET /api/teachers/birthday-reminders
**Description**: Get upcoming teacher birthdays

**Response**:
```json
{
  "upcomingBirthdays": [
    {
      "teacherId": "tch_001",
      "name": "Sarah Williams",
      "birthday": "2025-08-15",
      "daysUntil": 13
    }
  ]
}
```
