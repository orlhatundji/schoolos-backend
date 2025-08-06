# Students API Endpoint Specifications

Based on the Saint James Admin Portal Students UI, here are the required API endpoints:

## 1. Students Overview Statistics

### GET /api/students/overview
**Description**: Get overall student statistics and summary metrics

**Response**:
```json
{
  "statistics": {
    "totalStudents": {
      "count": 25,
      "description": "Across all classes"
    },
    "activeStudents": {
      "count": 19,
      "description": "Currently enrolled"
    },
    "inactive": {
      "count": 3,
      "description": "Not currently active"
    },
    "suspended": {
      "count": 3,
      "description": "Currently suspended"
    }
  }
}
```

## 2. Students List with Pagination

### GET /api/students
**Description**: Get paginated list of all students with detailed information

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term for student name, email, or student ID
- `level` (optional): Filter by level (e.g., "JSS 1", "JSS 2", "SS 1")
- `classArm` (optional): Filter by class arm (e.g., "Alpha", "Ruby", "Gold")
- `status` (optional): Filter by status ("active", "inactive", "suspended")
- `gender` (optional): Filter by gender ("male", "female")
- `ageMin` (optional): Minimum age filter
- `ageMax` (optional): Maximum age filter
- `sortBy` (optional): Sort field ("name", "age", "level", "studentId", "status")
- `sortOrder` (optional): "asc" | "desc" (default: "asc")

**Response**:
```json
{
  "students": [
    {
      "id": "std_001",
      "serialNumber": 1,
      "user": {
        "id": "usr_001",
        "firstName": "Alice",
        "lastName": "Johnson",
        "email": "alice.johnson@stjames.edu",
        "avatar": "/avatars/alice_johnson.jpg",
        "dateOfBirth": "2012-03-15"
      },
      "studentId": "STJ001",
      "studentNo": "STJ001",
      "admissionNo": "ADM2024001",
      "admissionDate": "2024-09-01",
      "level": {
        "id": "lvl_jss2",
        "name": "JSS 2"
      },
      "classArm": {
        "id": "cls_jss2_ruby",
        "name": "Ruby",
        "fullName": "JSS 2 Ruby"
      },
      "age": 13,
      "gender": "Female",
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "guardian": {
        "id": "grd_001",
        "name": "Mr. Robert Johnson",
        "phone": "+234-800-000-0001",
        "email": "robert.johnson@email.com",
        "relationship": "Father"
      },
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T10:00:00Z"
    },
    {
      "id": "std_002",
      "serialNumber": 2,
      "user": {
        "id": "usr_002",
        "firstName": "David",
        "lastName": "Chen",
        "email": "david.chen@stjames.edu",
        "avatar": "/avatars/david_chen.jpg",
        "dateOfBirth": "2010-07-22"
      },
      "studentId": "STJ002",
      "studentNo": "STJ002",
      "admissionNo": "ADM2023002",
      "admissionDate": "2023-09-01",
      "level": {
        "id": "lvl_ss1",
        "name": "SS 1"
      },
      "classArm": {
        "id": "cls_ss1_gold",
        "name": "Gold",
        "fullName": "SS 1 Gold"
      },
      "age": 15,
      "gender": "Male",
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "guardian": {
        "id": "grd_002",
        "name": "Mrs. Linda Chen",
        "phone": "+234-800-000-0002",
        "email": "linda.chen@email.com",
        "relationship": "Mother"
      },
      "createdAt": "2023-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T09:30:00Z"
    },
    {
      "id": "std_003",
      "serialNumber": 3,
      "user": {
        "id": "usr_003",
        "firstName": "Sarah",
        "lastName": "Williams",
        "email": "sarah.williams@stjames.edu",
        "avatar": "/avatars/sarah_williams.jpg",
        "dateOfBirth": "2011-11-10"
      },
      "studentId": "STJ003",
      "studentNo": "STJ003",
      "admissionNo": "ADM2024003",
      "admissionDate": "2024-09-01",
      "level": {
        "id": "lvl_jss3",
        "name": "JSS 3"
      },
      "classArm": {
        "id": "cls_jss3_emerald",
        "name": "Emerald",
        "fullName": "JSS 3 Emerald"
      },
      "age": 14,
      "gender": "Female",
      "status": {
        "current": "inactive",
        "label": "Inactive",
        "badge": {
          "text": "Inactive",
          "color": "gray",
          "backgroundColor": "#f5f5f5"
        }
      },
      "guardian": {
        "id": "grd_003",
        "name": "Dr. Michael Williams",
        "phone": "+234-800-000-0003",
        "email": "michael.williams@email.com",
        "relationship": "Father"
      },
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T09:45:00Z"
    },
    {
      "id": "std_004",
      "serialNumber": 4,
      "user": {
        "id": "usr_004",
        "firstName": "Emily",
        "lastName": "Davis",
        "email": "emily.davis@stjames.edu",
        "avatar": "/avatars/emily_davis.jpg",
        "dateOfBirth": "2009-05-18"
      },
      "studentId": "STJ004",
      "studentNo": "STJ004",
      "admissionNo": "ADM2022004",
      "admissionDate": "2022-09-01",
      "level": {
        "id": "lvl_ss2",
        "name": "SS 2"
      },
      "classArm": {
        "id": "cls_ss2_phoenix",
        "name": "Phoenix",
        "fullName": "SS 2 Phoenix"
      },
      "age": 16,
      "gender": "Female",
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "guardian": {
        "id": "grd_004",
        "name": "Mrs. Janet Davis",
        "phone": "+234-800-000-0004",
        "email": "janet.davis@email.com",
        "relationship": "Mother"
      },
      "createdAt": "2022-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T09:15:00Z"
    },
    {
      "id": "std_005",
      "serialNumber": 5,
      "user": {
        "id": "usr_005",
        "firstName": "James",
        "lastName": "Wilson",
        "email": "james.wilson@stjames.edu",
        "avatar": "/avatars/james_wilson.jpg",
        "dateOfBirth": "2013-01-25"
      },
      "studentId": "STJ005",
      "studentNo": "STJ005",
      "admissionNo": "ADM2024005",
      "admissionDate": "2024-09-01",
      "level": {
        "id": "lvl_jss1",
        "name": "JSS 1"
      },
      "classArm": {
        "id": "cls_jss1_alpha",
        "name": "Alpha",
        "fullName": "JSS 1 Alpha"
      },
      "age": 12,
      "gender": "Male",
      "status": {
        "current": "suspended",
        "label": "Suspended",
        "badge": {
          "text": "Suspended",
          "color": "red",
          "backgroundColor": "#ffebee"
        }
      },
      "guardian": {
        "id": "grd_005",
        "name": "Mr. Thomas Wilson",
        "phone": "+234-800-000-0005",
        "email": "thomas.wilson@email.com",
        "relationship": "Father"
      },
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T08:30:00Z"
    },
    {
      "id": "std_006",
      "serialNumber": 6,
      "user": {
        "id": "usr_006",
        "firstName": "Maria",
        "lastName": "Rodriguez",
        "email": "maria.rodriguez@stjames.edu",
        "avatar": "/avatars/maria_rodriguez.jpg",
        "dateOfBirth": "2013-09-12"
      },
      "studentId": "STJ006",
      "studentNo": "STJ006",
      "admissionNo": "ADM2024006",
      "admissionDate": "2024-09-01",
      "level": {
        "id": "lvl_jss1",
        "name": "JSS 1"
      },
      "classArm": {
        "id": "cls_jss1_ruby",
        "name": "Ruby",
        "fullName": "JSS 1 Ruby"
      },
      "age": 12,
      "gender": "Female",
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "guardian": {
        "id": "grd_006",
        "name": "Mrs. Carmen Rodriguez",
        "phone": "+234-800-000-0006",
        "email": "carmen.rodriguez@email.com",
        "relationship": "Mother"
      },
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T08:00:00Z"
    },
    {
      "id": "std_007",
      "serialNumber": 7,
      "user": {
        "id": "usr_007",
        "firstName": "Michael",
        "lastName": "Brown",
        "email": "michael.brown@stjames.edu",
        "avatar": "/avatars/michael_brown.jpg",
        "dateOfBirth": "2008-12-03"
      },
      "studentId": "STJ007",
      "studentNo": "STJ007",
      "admissionNo": "ADM2021007",
      "admissionDate": "2021-09-01",
      "level": {
        "id": "lvl_ss3",
        "name": "SS 3"
      },
      "classArm": {
        "id": "cls_ss3_diamond",
        "name": "Diamond",
        "fullName": "SS 3 Diamond"
      },
      "age": 17,
      "gender": "Male",
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "guardian": {
        "id": "grd_007",
        "name": "Mr. David Brown",
        "phone": "+234-800-000-0007",
        "email": "david.brown@email.com",
        "relationship": "Father"
      },
      "createdAt": "2021-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T07:30:00Z"
    },
    {
      "id": "std_008",
      "serialNumber": 8,
      "user": {
        "id": "usr_008",
        "firstName": "Aisha",
        "lastName": "Okafor",
        "email": "aisha.okafor@stjames.edu",
        "avatar": "/avatars/aisha_okafor.jpg",
        "dateOfBirth": "2012-06-28"
      },
      "studentId": "STJ008",
      "studentNo": "STJ008",
      "admissionNo": "ADM2024008",
      "admissionDate": "2024-09-01",
      "level": {
        "id": "lvl_jss2",
        "name": "JSS 2"
      },
      "classArm": {
        "id": "cls_jss2_alpha",
        "name": "Alpha",
        "fullName": "JSS 2 Alpha"
      },
      "age": 13,
      "gender": "Female",
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "guardian": {
        "id": "grd_008",
        "name": "Mr. Chidi Okafor",
        "phone": "+234-800-000-0008",
        "email": "chidi.okafor@email.com",
        "relationship": "Father"
      },
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T07:00:00Z"
    },
    {
      "id": "std_009",
      "serialNumber": 9,
      "user": {
        "id": "usr_009",
        "firstName": "Benjamin",
        "lastName": "Lee",
        "email": "benjamin.lee@stjames.edu",
        "avatar": "/avatars/benjamin_lee.jpg",
        "dateOfBirth": "2010-04-14"
      },
      "studentId": "STJ009",
      "studentNo": "STJ009",
      "admissionNo": "ADM2023009",
      "admissionDate": "2023-09-01",
      "level": {
        "id": "lvl_ss1",
        "name": "SS 1"
      },
      "classArm": {
        "id": "cls_ss1_emerald",
        "name": "Emerald",
        "fullName": "SS 1 Emerald"
      },
      "age": 15,
      "gender": "Male",
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "guardian": {
        "id": "grd_009",
        "name": "Mrs. Grace Lee",
        "phone": "+234-800-000-0009",
        "email": "grace.lee@email.com",
        "relationship": "Mother"
      },
      "createdAt": "2023-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T06:30:00Z"
    },
    {
      "id": "std_010",
      "serialNumber": 10,
      "user": {
        "id": "usr_010",
        "firstName": "Grace",
        "lastName": "Adebayo",
        "email": "grace.adebayo@stjames.edu",
        "avatar": "/avatars/grace_adebayo.jpg",
        "dateOfBirth": "2011-08-07"
      },
      "studentId": "STJ010",
      "studentNo": "STJ010",
      "admissionNo": "ADM2024010",
      "admissionDate": "2024-09-01",
      "level": {
        "id": "lvl_jss3",
        "name": "JSS 3"
      },
      "classArm": {
        "id": "cls_jss3_sapphire",
        "name": "Sapphire",
        "fullName": "JSS 3 Sapphire"
      },
      "age": 14,
      "gender": "Female",
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "Active",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "guardian": {
        "id": "grd_010",
        "name": "Dr. Tunde Adebayo",
        "phone": "+234-800-000-0010",
        "email": "tunde.adebayo@email.com",
        "relationship": "Father"
      },
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T06:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 25,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "summary": {
    "totalStudents": 25,
    "displayedRange": "1 to 10 of 25 students",
    "statusBreakdown": {
      "active": 19,
      "inactive": 3,
      "suspended": 3
    },
    "genderBreakdown": {
      "male": 12,
      "female": 13
    },
    "levelBreakdown": {
      "JSS 1": 4,
      "JSS 2": 5,
      "JSS 3": 6,
      "SS 1": 4,
      "SS 2": 3,
      "SS 3": 3
    },
    "ageDistribution": {
      "12": 3,
      "13": 4,
      "14": 5,
      "15": 6,
      "16": 4,
      "17": 3
    }
  }
}
```

## 3. Single Student Details

### GET /api/students/{studentId}
**Description**: Get detailed information about a specific student

**Path Parameters**:
- `studentId`: Unique identifier for the student

**Response**:
```json
{
  "student": {
    "id": "std_001",
    "user": {
      "id": "usr_001",
      "firstName": "Alice",
      "lastName": "Johnson",
      "email": "alice.johnson@stjames.edu",
      "phone": "+234-800-000-0001",
      "avatar": "/avatars/alice_johnson.jpg",
      "dateOfBirth": "2012-03-15",
      "address": {
        "street1": "123 Victoria Island",
        "city": "Lagos",
        "state": "Lagos State",
        "country": "Nigeria"
      }
    },
    "studentId": "STJ001",
    "studentNo": "STJ001",
    "admissionNo": "ADM2024001",
    "admissionDate": "2024-09-01",
    "level": {
      "id": "lvl_jss2",
      "name": "JSS 2"
    },
    "classArm": {
      "id": "cls_jss2_ruby",
      "name": "Ruby",
      "fullName": "JSS 2 Ruby",
      "classTeacher": {
        "id": "tch_001",
        "name": "Mrs. Sarah Williams",
        "email": "sarah.williams@school.edu"
      }
    },
    "age": 13,
    "gender": "Female",
    "status": {
      "current": "active",
      "label": "Active",
      "lastChanged": "2024-09-01T00:00:00Z"
    },
    "guardian": {
      "id": "grd_001",
      "user": {
        "id": "usr_grd_001",
        "firstName": "Robert",
        "lastName": "Johnson",
        "email": "robert.johnson@email.com",
        "phone": "+234-800-000-0001"
      },
      "relationship": "Father",
      "isEmergencyContact": true
    },
    "academic": {
      "currentSession": {
        "id": "sess_2024_2025",
        "name": "2024/2025",
        "currentTerm": "First Term"
      },
      "enrolledSubjects": [
        {
          "id": "subj_001",
          "name": "Mathematics",
          "teacher": "Mr. John Doe"
        },
        {
          "id": "subj_002",
          "name": "English Language",
          "teacher": "Mrs. Jane Smith"
        }
      ],
      "currentGPA": 3.8,
      "rank": 5,
      "totalStudentsInClass": 28
    },
    "attendance": {
      "currentTerm": {
        "totalDays": 65,
        "presentDays": 62,
        "absentDays": 2,
        "lateDays": 1,
        "attendanceRate": 95.4
      }
    },
    "discipline": {
      "incidents": 0,
      "commendations": 2,
      "lastIncident": null
    },
    "medical": {
      "bloodGroup": "O+",
      "allergies": ["Peanuts"],
      "medicalConditions": [],
      "emergencyContact": {
        "name": "Dr. Michael Johnson",
        "phone": "+234-800-000-0002",
        "relationship": "Uncle",
        "hospital": "Lagos University Teaching Hospital"
      }
    },
    "createdAt": "2024-09-01T00:00:00Z",
    "updatedAt": "2025-08-02T10:00:00Z"
  }
}
```

## 4. Get Levels and Class Arms for Form Dropdowns

### GET /api/levels
**Description**: Get list of all levels for form dropdowns

**Response**:
```json
{
  "levels": [
    {
      "id": "lvl_jss1",
      "name": "JSS 1",
      "classArms": [
        {
          "id": "cls_jss1_alpha",
          "name": "Alpha"
        },
        {
          "id": "cls_jss1_ruby",
          "name": "Ruby"
        },
        {
          "id": "cls_jss1_sapphire",
          "name": "Sapphire"
        }
      ]
    },
    {
      "id": "lvl_jss2",
      "name": "JSS 2",
      "classArms": [
        {
          "id": "cls_jss2_alpha",
          "name": "Alpha"
        },
        {
          "id": "cls_jss2_ruby",
          "name": "Ruby"
        },
        {
          "id": "cls_jss2_emerald",
          "name": "Emerald"
        }
      ]
    },
    {
      "id": "lvl_jss3",
      "name": "JSS 3",
      "classArms": [
        {
          "id": "cls_jss3_emerald",
          "name": "Emerald"
        },
        {
          "id": "cls_jss3_sapphire",
          "name": "Sapphire"
        },
        {
          "id": "cls_jss3_diamond",
          "name": "Diamond"
        }
      ]
    },
    {
      "id": "lvl_ss1",
      "name": "SS 1",
      "classArms": [
        {
          "id": "cls_ss1_gold",
          "name": "Gold"
        },
        {
          "id": "cls_ss1_silver",
          "name": "Silver"
        },
        {
          "id": "cls_ss1_emerald",
          "name": "Emerald"
        }
      ]
    },
    {
      "id": "lvl_ss2",
      "name": "SS 2",
      "classArms": [
        {
          "id": "cls_ss2_phoenix",
          "name": "Phoenix"
        },
        {
          "id": "cls_ss2_diamond",
          "name": "Diamond"
        }
      ]
    },
    {
      "id": "lvl_ss3",
      "name": "SS 3",
      "classArms": [
        {
          "id": "cls_ss3_diamond",
          "name": "Diamond"
        },
        {
          "id": "cls_ss3_emerald",
          "name": "Emerald"
        }
      ]
    }
  ]
}
```

## 5. Upload Student Profile Picture

### POST /api/students/upload-avatar
**Description**: Upload profile picture for a student

**Request**: Multipart form data
- `file`: Image file (max 5MB, square image recommended 200x200px minimum)
- `studentId` (optional): If updating existing student, otherwise for new student creation

**Response**:
```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "avatar": {
    "url": "/uploads/avatars/student_12345.jpg",
    "filename": "student_12345.jpg",
    "size": 1024000,
    "mimeType": "image/jpeg"
  }
}
```

## 6. Create New Student

### POST /api/students
**Description**: Create a new student record

**Request Body**:
```json
{
  "personalInformation": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@stjames.edu",
    "phone": "+234-XXX-XXX-XXXX",
    "dateOfBirth": "2012-05-15",
    "gender": "Male",
    "address": {
      "street1": "123 Main Street",
      "city": "Lagos",
      "state": "Lagos State",
      "country": "Nigeria"
    }
  },
  "profilePicture": {
    "avatarUrl": "/uploads/avatars/student_12345.jpg"
  },
  "academicInformation": {
    "levelId": "lvl_jss1",
    "classArmId": "cls_jss1_alpha",
    "admissionDate": "2025-09-01"
  },
  "guardianInformation": {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane.doe@email.com",
    "phone": "+234-XXX-XXX-XXXX",
    "relationship": "Mother",
    "address": {
      "street1": "123 Main Street",
      "city": "Lagos",
      "state": "Lagos State",
      "country": "Nigeria"
    }
  },
  "medicalInformation": {
    "bloodGroup": "O+",
    "allergies": ["Peanuts"],
    "medicalConditions": [],
    "emergencyContact": {
      "name": "Dr. Smith",
      "phone": "+234-XXX-XXX-XXXX",
      "relationship": "Family Doctor"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Student created successfully",
  "student": {
    "id": "std_026",
    "studentId": "STJ026",
    "studentNo": "STJ026",
    "admissionNo": "ADM2025026",
    "user": {
      "id": "usr_026",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@stjames.edu"
    },
    "level": {
      "id": "lvl_jss1",
      "name": "JSS 1"
    },
    "classArm": {
      "id": "cls_jss1_alpha",
      "name": "Alpha"
    },
    "status": "active",
    "createdAt": "2025-08-02T15:30:00Z"
  }
}
```

## 7. Update Student

### PUT /api/students/{studentId}
**Description**: Update student information

**Path Parameters**:
- `studentId`: Unique identifier for the student

**Request Body**:
```json
{
  "personalInformation": {
    "phone": "+234-800-000-0025",
    "address": {
      "street1": "789 New Street",
      "city": "Abuja"
    }
  },
  "academicInformation": {
    "classArmId": "cls_jss2_ruby"
  },
  "status": "active"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Student updated successfully",
  "student": {
    "id": "std_001",
    "updatedAt": "2025-08-02T15:45:00Z"
  }
}
```

## 8. Update Student Status

### PATCH /api/students/{studentId}/status
**Description**: Update student status (active, inactive, suspended)

**Path Parameters**:
- `studentId`: Unique identifier for the student

**Request Body**:
```json
{
  "status": "suspended",
  "reason": "Disciplinary action",
  "effectiveDate": "2025-08-03",
  "notes": "Student suspended for 1 week due to misconduct"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Student status updated successfully",
  "statusChange": {
    "studentId": "std_005",
    "previousStatus": "active",
    "newStatus": "suspended",
    "effectiveDate": "2025-08-03T00:00:00Z",
    "reason": "Disciplinary action"
  }
}
```

## 9. Student Attendance

### GET /api/students/{studentId}/attendance
**Description**: Get attendance records for a student

**Path Parameters**:
- `studentId`: Unique identifier for the student

**Query Parameters**:
- `term` (optional): Specific term
- `month` (optional): Specific month (YYYY-MM format)
- `dateFrom` (optional): Start date (YYYY-MM-DD)
- `dateTo` (optional): End date (YYYY-MM-DD)

**Response**:
```json
{
  "attendance": {
    "summary": {
      "totalDays": 65,
      "presentDays": 62,
      "absentDays": 2,
      "lateDays": 1,
      "excusedDays": 0,
      "attendanceRate": 95.4
    },
    "records": [
      {
        "date": "2025-08-01",
        "status": "present",
        "timeIn": "07:45:00",
        "timeOut": "14:30:00",
        "notes": null
      },
      {
        "date": "2025-08-02",
        "status": "late",
        "timeIn": "08:15:00",
        "timeOut": "14:30:00",
        "notes": "Traffic delay"
      }
    ]
  }
}
```

## 10. Student Academic Performance

### GET /api/students/{studentId}/performance
**Description**: Get student academic performance and grades

**Path Parameters**:
- `studentId`: Unique identifier for the student

**Query Parameters**:
- `term` (optional): Specific term
- `session` (optional): Specific academic session

**Response**:
```json
{
  "performance": {
    "overall": {
      "gpa": 3.8,
      "grade": "B+",
      "rank": 5,
      "totalStudentsInClass": 28,
      "percentile": 82.1
    },
    "subjects": [
      {
        "id": "subj_001",
        "name": "Mathematics",
        "teacher": "Mr. John Doe",
        "scores": {
          "classwork": 85,
          "assignments": 90,
          "tests": 78,
          "exam": 82,
          "total": 83.75
        },
        "grade": "B+",
        "position": 3
      },
      {
        "id": "subj_002",
        "name": "English Language",
        "teacher": "Mrs. Jane Smith",
        "scores": {
          "classwork": 88,
          "assignments": 92,
          "tests": 85,
          "exam": 87,
          "total": 88.0
        },
        "grade": "A-",
        "position": 2
      }
    ],
    "trends": {
      "improvement": [
        {
          "subject": "Mathematics",
          "previousScore": 75,
          "currentScore": 83.75,
          "change": "+8.75"
        }
      ],
      "decline": []
    }
  }
}
```

## 11. Search and Filter Options

### GET /api/students/filters
**Description**: Get available filter options for students

**Response**:
```json
{
  "levels": [
    { "id": "lvl_jss1", "name": "JSS 1", "studentCount": 4 },
    { "id": "lvl_jss2", "name": "JSS 2", "studentCount": 5 },
    { "id": "lvl_jss3", "name": "JSS 3", "studentCount": 6 },
    { "id": "lvl_ss1", "name": "SS 1", "studentCount": 4 },
    { "id": "lvl_ss2", "name": "SS 2", "studentCount": 3 },
    { "id": "lvl_ss3", "name": "SS 3", "studentCount": 3 }
  ],
  "classArms": [
    { "id": "cls_jss1_alpha", "name": "JSS 1 Alpha", "studentCount": 2 },
    { "id": "cls_jss1_ruby", "name": "JSS 1 Ruby", "studentCount": 1 },
    { "id": "cls_jss2_ruby", "name": "JSS 2 Ruby", "studentCount": 1 },
    { "id": "cls_jss2_alpha", "name": "JSS 2 Alpha", "studentCount": 1 },
    { "id": "cls_ss1_gold", "name": "SS 1 Gold", "studentCount": 1 },
    { "id": "cls_ss1_emerald", "name": "SS 1 Emerald", "studentCount": 1 }
  ],
  "statuses": [
    { "status": "active", "label": "Active", "count": 19 },
    { "status": "inactive", "label": "Inactive", "count": 3 },
    { "status": "suspended", "label": "Suspended", "count": 3 }
  ],
  "genders": [
    { "gender": "male", "label": "Male", "count": 12 },
    { "gender": "female", "label": "Female", "count": 13 }
  ],
  "ageRanges": [
    { "range": "12", "label": "12 years", "count": 3 },
    { "range": "13", "label": "13 years", "count": 4 },
    { "range": "14", "label": "14 years", "count": 5 },
    { "range": "15", "label": "15 years", "count": 6 },
    { "range": "16", "label": "16 years", "count": 4 },
    { "range": "17", "label": "17 years", "count": 3 }
  ]
}
```

## Error Responses

All endpoints should return consistent error responses:

```json
{
  "error": {
    "code": "STUDENT_NOT_FOUND",
    "message": "Student with ID 'std_999' not found.",
    "details": {
      "studentId": "std_999"
    }
  }
}
```

## Security & Authentication

- All endpoints require authentication via JWT token
- Admin role required for create/update/delete operations
- Teachers can view students in their assigned classes
- Guardians can only view their own children's information
- Rate limiting: 100 requests per minute per user
- Input validation for all POST/PUT requests
- Email uniqueness validation
- Student ID uniqueness validation

## Caching Strategy

- Students overview: Cache for 10 minutes
- Students list: Cache for 5 minutes
- Single student details: Cache for 15 minutes
- Student attendance: Cache for 1 hour
- Student performance: Cache for 30 minutes
- Filter options: Cache for 1 hour

## Additional Features

### GET /api/students/export
**Description**: Export students data to Excel/CSV

**Query Parameters**:
- `format`: "excel" | "csv"
- `filters`: Same as students list filters

### GET /api/students/birthday-reminders
**Description**: Get upcoming student birthdays

**Response**:
```json
{
  "upcomingBirthdays": [
    {
      "studentId": "std_001",
      "name": "Alice Johnson",
      "birthday": "2025-08-15",
      "daysUntil": 13,
      "age": 13,
      "classArm": "JSS 2 Ruby"
    }
  ]
}
```

### GET /api/students/bulk-operations
**Description**: Get bulk operation templates and options

**Response**:
```json
{
  "operations": [
    {
      "name": "Bulk Status Update",
      "description": "Update status for multiple students",
      "template": "/templates/bulk-status-update.csv"
    },
    {
      "name": "Bulk Class Transfer",
      "description": "Transfer multiple students to different classes",
      "template": "/templates/bulk-class-transfer.csv"
    }
  ]
}
```

## Integration with Prisma Schema

Based on the provided Prisma schema, these endpoints will integrate with the following models:

- **Student**: Core student information
- **User**: Authentication and profile data
- **ClassArm**: Class assignment
- **Level**: Grade/year information
- **Guardian**: Parent/guardian relationships
- **StudentAttendance**: Attendance tracking
- **SubjectTermStudent**: Academic performance
- **Address**: Student and guardian addresses
- **School**: Multi-school support
- **AcademicSession**: Session and term context

The API endpoints ensure full CRUD operations while maintaining data integrity and proper relationships as defined in the schema.
