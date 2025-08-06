# Create API specifications for school sign up
_Exported on 7/29/2025 at 14:05:32 GMT+1 from Cursor (1.2.4)_

---

**User**

dont edit code. just respond here.

create api specifications for these:

Schools should be able to sign up on the platform.
Our support team / admins receive the sign up requests for verification. After verifying (following up or whatnot) they approve or disapprove then the school account is created.


---

**Cursor**

I'll analyze the codebase to understand the current structure and create API specifications for the school signup and approval workflow.


Based on my analysis of the codebase, I can see that the current system has a basic school creation functionality but lacks the approval workflow you described. Here are the API specifications for implementing the school signup and approval system:

## API Specifications for School Signup and Approval Workflow

### 1. School Signup Request API

**Endpoint:** `POST /api/schools/signup`

**Description:** Allows schools to submit signup requests for platform access.

**Request Body:**
```json
{
  "schoolName": "string",
  "schoolCode": "string", 
  "contactPerson": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string"
  },
  "address": {
    "country": "string",
    "state": "string", 
    "city": "string",
    "street1": "string",
    "street2": "string (optional)",
    "zip": "string (optional)"
  },
  "schoolDetails": {
    "type": "PRIMARY | SECONDARY | TERTIARY | MIXED",
    "capacity": "number (optional)",
    "website": "string (optional)",
    "description": "string (optional)"
  },
  "documents": {
    "registrationCertificate": "string (base64)",
    "taxClearance": "string (base64, optional)",
    "otherDocuments": ["string (base64, optional)"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "status": "PENDING",
    "message": "School signup request submitted successfully. Our team will review and contact you within 2-3 business days."
  }
}
```

### 2. Get Signup Request Status API

**Endpoint:** `GET /api/schools/signup/{requestId}/status`

**Description:** Allows schools to check the status of their signup request.

**Response:**
```json
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "status": "PENDING | UNDER_REVIEW | APPROVED | REJECTED",
    "submittedAt": "datetime",
    "reviewedAt": "datetime (optional)",
    "reviewerNotes": "string (optional)",
    "estimatedReviewTime": "2-3 business days"
  }
}
```

### 3. Admin APIs for Managing Signup Requests

#### 3.1 Get All Pending Signup Requests

**Endpoint:** `GET /api/admin/school-signup-requests`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `status`: `PENDING | UNDER_REVIEW | APPROVED | REJECTED` (optional)
- `page`: `number` (default: 1)
- `limit`: `number` (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "uuid",
        "schoolName": "string",
        "schoolCode": "string",
        "contactPerson": {
          "firstName": "string",
          "lastName": "string", 
          "email": "string",
          "phone": "string"
        },
        "address": {
          "country": "string",
          "state": "string",
          "city": "string",
          "street1": "string"
        },
        "status": "PENDING",
        "submittedAt": "datetime",
        "documents": {
          "registrationCertificate": "string (url)",
          "taxClearance": "string (url, optional)"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

#### 3.2 Get Single Signup Request Details

**Endpoint:** `GET /api/admin/school-signup-requests/{requestId}`

**Headers:** `Authorization: Bearer {admin_token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "schoolName": "string",
    "schoolCode": "string",
    "contactPerson": {
      "firstName": "string",
      "lastName": "string",
      "email": "string", 
      "phone": "string"
    },
    "address": {
      "country": "string",
      "state": "string",
      "city": "string",
      "street1": "string",
      "street2": "string",
      "zip": "string"
    },
    "schoolDetails": {
      "type": "PRIMARY",
      "capacity": 500,
      "website": "https://example.com",
      "description": "string"
    },
    "status": "PENDING",
    "submittedAt": "datetime",
    "documents": {
      "registrationCertificate": "string (url)",
      "taxClearance": "string (url)",
      "otherDocuments": ["string (url)"]
    },
    "reviewHistory": [
      {
        "action": "REVIEW_STARTED",
        "adminId": "uuid",
        "adminName": "string",
        "timestamp": "datetime",
        "notes": "string"
      }
    ]
  }
}
```

#### 3.3 Start Review Process

**Endpoint:** `POST /api/admin/school-signup-requests/{requestId}/start-review`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "notes": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "status": "UNDER_REVIEW",
    "reviewerId": "uuid",
    "reviewStartedAt": "datetime"
  }
}
```

#### 3.4 Approve School Signup Request

**Endpoint:** `POST /api/admin/school-signup-requests/{requestId}/approve`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "notes": "string (optional)",
  "adminCredentials": {
    "adminEmail": "string",
    "adminPassword": "string"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "status": "APPROVED",
    "schoolId": "uuid",
    "schoolCode": "string",
    "adminUserId": "uuid",
    "approvedAt": "datetime",
    "message": "School account created successfully. Admin credentials sent to contact person."
  }
}
```

#### 3.5 Reject School Signup Request

**Endpoint:** `POST /api/admin/school-signup-requests/{requestId}/reject`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "reason": "string (required)",
  "notes": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "status": "REJECTED",
    "rejectedAt": "datetime",
    "reason": "string"
  }
}
```

### 4. Database Schema Extensions

The current schema would need these additions:

```prisma
enum SchoolSignupStatus {
  PENDING
  UNDER_REVIEW
  APPROVED
  REJECTED
}

enum SchoolType {
  PRIMARY
  SECONDARY
  TERTIARY
  MIXED
}

model SchoolSignupRequest {
  id              String              @id @default(uuid())
  schoolName      String
  schoolCode      String              @unique
  contactPerson   Json                // Store contact person details
  address         Json                // Store address details
  schoolDetails   Json                // Store school details
  documents       Json                // Store document URLs
  status          SchoolSignupStatus  @default(PENDING)
  submittedAt     DateTime            @default(now())
  reviewedAt      DateTime?
  reviewerId      String?
  reviewer        Admin?              @relation(fields: [reviewerId], references: [id])
  notes           String?
  rejectionReason String?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@map("school_signup_requests")
}

// Add to Admin model
model Admin {
  // ... existing fields
  reviewedSignupRequests SchoolSignupRequest[]
}
```

### 5. Email Notifications

The system should send emails for:
- Signup request confirmation to school contact
- Approval notification with admin credentials
- Rejection notification with reasons
- Status updates to school contact

### 6. Security Considerations

- Rate limiting on signup requests
- Document validation and virus scanning
- Admin authentication and authorization
- Audit logging for all approval/rejection actions
- Data encryption for sensitive information

This API specification provides a complete workflow for school signup with admin approval, maintaining security and providing transparency throughout the process.

```json
{
  "schoolName": "string",
  "schoolCode": "string", 
  "contactPerson": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string"
  },
  "address": {
    "country": "string",
    "state": "string", 
    "city": "string",
    "street1": "string",
    "street2": "string (optional)",
    "zip": "string (optional)"
  },
  "schoolDetails": {
    "type": "PRIMARY | SECONDARY | TERTIARY | MIXED",
    "capacity": "number (optional)",
    "website": "string (optional)",
    "description": "string (optional)"
  },
  "documents": {
    "registrationCertificate": "string (base64)",
    "taxClearance": "string (base64, optional)",
    "otherDocuments": ["string (base64, optional)"]
  }
}
```

```json
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "status": "PENDING",
    "message": "School signup request submitted successfully. Our team will review and contact you within 2-3 business days."
  }
}
```

```json
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "status": "PENDING | UNDER_REVIEW | APPROVED | REJECTED",
    "submittedAt": "datetime",
    "reviewedAt": "datetime (optional)",
    "reviewerNotes": "string (optional)",
    "estimatedReviewTime": "2-3 business days"
  }
}
```

```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "uuid",
        "schoolName": "string",
        "schoolCode": "string",
        "contactPerson": {
          "firstName": "string",
          "lastName": "string", 
          "email": "string",
          "phone": "string"
        },
        "address": {
          "country": "string",
          "state": "string",
          "city": "string",
          "street1": "string"
        },
        "status": "PENDING",
        "submittedAt": "datetime",
        "documents": {
          "registrationCertificate": "string (url)",
          "taxClearance": "string (url, optional)"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "schoolName": "string",
    "schoolCode": "string",
    "contactPerson": {
      "firstName": "string",
      "lastName": "string",
      "email": "string", 
      "phone": "string"
    },
    "address": {
      "country": "string",
      "state": "string",
      "city": "string",
      "street1": "string",
      "street2": "string",
      "zip": "string"
    },
    "schoolDetails": {
      "type": "PRIMARY",
      "capacity": 500,
      "website": "https://example.com",
      "description": "string"
    },
    "status": "PENDING",
    "submittedAt": "datetime",
    "documents": {
      "registrationCertificate": "string (url)",
      "taxClearance": "string (url)",
      "otherDocuments": ["string (url)"]
    },
    "reviewHistory": [
      {
        "action": "REVIEW_STARTED",
        "adminId": "uuid",
        "adminName": "string",
        "timestamp": "datetime",
        "notes": "string"
      }
    ]
  }
}
```

```json
{
  "notes": "string (optional)"
}
```

```json
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "status": "UNDER_REVIEW",
    "reviewerId": "uuid",
    "reviewStartedAt": "datetime"
  }
}
```

```json
{
  "notes": "string (optional)",
  "adminCredentials": {
    "adminEmail": "string",
    "adminPassword": "string"
  }
}
```

```json
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "status": "APPROVED",
    "schoolId": "uuid",
    "schoolCode": "string",
    "adminUserId": "uuid",
    "approvedAt": "datetime",
    "message": "School account created successfully. Admin credentials sent to contact person."
  }
}
```

```json
{
  "reason": "string (required)",
  "notes": "string (optional)"
}
```

```json
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "status": "REJECTED",
    "rejectedAt": "datetime",
    "reason": "string"
  }
}
```

```prisma
enum SchoolSignupStatus {
  PENDING
  UNDER_REVIEW
  APPROVED
  REJECTED
}

enum SchoolType {
  PRIMARY
  SECONDARY
  TERTIARY
  MIXED
}

model SchoolSignupRequest {
  id              String              @id @default(uuid())
  schoolName      String
  schoolCode      String              @unique
  contactPerson   Json                // Store contact person details
  address         Json                // Store address details
  schoolDetails   Json                // Store school details
  documents       Json                // Store document URLs
  status          SchoolSignupStatus  @default(PENDING)
  submittedAt     DateTime            @default(now())
  reviewedAt      DateTime?
  reviewerId      String?
  reviewer        Admin?              @relation(fields: [reviewerId], references: [id])
  notes           String?
  rejectionReason String?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@map("school_signup_requests")
}

// Add to Admin model
model Admin {
  // ... existing fields
  reviewedSignupRequests SchoolSignupRequest[]
}
```

---

**User**

okay. now. define the api endpoint specs for

"school admins" should be able to create and update
1. academic session
2. term. when creating a term, the UI will show a list of subjects that should be created for the term via subjectTerm. we should also have an endpoint to independently add a subject to a term (via subjectTerm)
3. teacher
4. student
5. level/class 
6. class arm
department
academic calender
academic calender item
subject
assessment structure (Assessment). total assessment maxScore must sum up to 100.
grading model (json)
make a teacher a classArm teacher (ClassArmTeacher)
make a teacher a classArm Subject teacher (ClassArmSubjectTeacher)
appoint a teacher as an hod of a department
create prefects
enroll students to a subject for a term. should accept array of student ids (SubjectTermStudent)




---

**Cursor**

Based on the current schema and codebase structure, here are the API endpoint specifications for school admin operations:

## School Admin API Endpoints

### 1. Academic Session Management

#### 1.1 Create Academic Session
**Endpoint:** `POST /api/admin/academic-sessions`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "academicYear": "string (e.g., '2024/2025')",
  "startDate": "datetime",
  "endDate": "datetime",
  "isCurrent": "boolean (optional, default: false)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "academicYear": "2024/2025",
    "startDate": "datetime",
    "endDate": "datetime",
    "isCurrent": false,
    "schoolId": "uuid",
    "createdAt": "datetime"
  }
}
```

#### 1.2 Update Academic Session
**Endpoint:** `PUT /api/admin/academic-sessions/{sessionId}`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "academicYear": "string (optional)",
  "startDate": "datetime (optional)",
  "endDate": "datetime (optional)",
  "isCurrent": "boolean (optional)"
}
```

#### 1.3 Get Academic Sessions
**Endpoint:** `GET /api/admin/academic-sessions`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `isCurrent`: `boolean (optional)`
- `page`: `number (default: 1)`
- `limit`: `number (default: 20)`

### 2. Term Management

#### 2.1 Create Term
**Endpoint:** `POST /api/admin/terms`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "name": "string (e.g., 'First Term')",
  "academicSessionId": "uuid",
  "subjects": [
    {
      "subjectId": "uuid",
      "curriculum": {
        "items": [
          {
            "title": "string",
            "description": "string (optional)"
          }
        ]
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "First Term",
    "academicSessionId": "uuid",
    "subjectTerms": [
      {
        "id": "uuid",
        "subjectId": "uuid",
        "curriculum": {
          "id": "uuid",
          "items": [
            {
              "id": "uuid",
              "title": "string"
            }
          ]
        }
      }
    ],
    "createdAt": "datetime"
  }
}
```

#### 2.2 Add Subject to Term
**Endpoint:** `POST /api/admin/terms/{termId}/subjects`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "subjectId": "uuid",
  "curriculum": {
    "items": [
      {
        "title": "string",
        "description": "string (optional)"
      }
    ]
  }
}
```

#### 2.3 Get Terms
**Endpoint:** `GET /api/admin/terms`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `academicSessionId`: `uuid (optional)`
- `page`: `number (default: 1)`
- `limit`: `number (default: 20)`

### 3. Teacher Management

#### 3.1 Create Teacher
**Endpoint:** `POST /api/admin/teachers`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string (optional)",
  "password": "string",
  "dateOfBirth": "datetime (optional)",
  "addressId": "uuid (optional)",
  "avatarUrl": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "teacherNo": "string (auto-generated)",
    "user": {
      "id": "uuid",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "phone": "string"
    },
    "createdAt": "datetime"
  }
}
```

#### 3.2 Update Teacher
**Endpoint:** `PUT /api/admin/teachers/{teacherId}`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "email": "string (optional)",
  "phone": "string (optional)",
  "dateOfBirth": "datetime (optional)",
  "addressId": "uuid (optional)",
  "avatarUrl": "string (optional)"
}
```

### 4. Student Management

#### 4.1 Create Student
**Endpoint:** `POST /api/admin/students`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string (optional)",
  "phone": "string (optional)",
  "password": "string",
  "dateOfBirth": "datetime (optional)",
  "addressId": "uuid (optional)",
  "avatarUrl": "string (optional)",
  "classArmId": "uuid",
  "guardianId": "uuid (optional)",
  "admissionNo": "string (optional)",
  "admissionDate": "datetime (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "studentNo": "string (auto-generated)",
    "admissionNo": "string",
    "admissionDate": "datetime",
    "classArmId": "uuid",
    "guardianId": "uuid",
    "user": {
      "id": "uuid",
      "firstName": "string",
      "lastName": "string",
      "email": "string"
    },
    "createdAt": "datetime"
  }
}
```

#### 4.2 Update Student
**Endpoint:** `PUT /api/admin/students/{studentId}`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "email": "string (optional)",
  "phone": "string (optional)",
  "dateOfBirth": "datetime (optional)",
  "addressId": "uuid (optional)",
  "avatarUrl": "string (optional)",
  "classArmId": "uuid (optional)",
  "guardianId": "uuid (optional)",
  "admissionNo": "string (optional)"
}
```

### 5. Level/Class Management

#### 5.1 Create Level
**Endpoint:** `POST /api/admin/levels`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "name": "string (e.g., 'JSS1', 'SS1')"
}
```

#### 5.2 Update Level
**Endpoint:** `PUT /api/admin/levels/{levelId}`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "name": "string"
}
```

### 6. Class Arm Management

#### 6.1 Create Class Arm
**Endpoint:** `POST /api/admin/class-arms`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "name": "string (e.g., 'JSS1A')",
  "academicSessionId": "uuid",
  "levelId": "uuid",
  "departmentId": "uuid (optional)"
}
```

#### 6.2 Update Class Arm
**Endpoint:** `PUT /api/admin/class-arms/{classArmId}`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "name": "string (optional)",
  "levelId": "uuid (optional)",
  "departmentId": "uuid (optional)"
}
```

### 7. Department Management

#### 7.1 Create Department
**Endpoint:** `POST /api/admin/departments`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "name": "string (e.g., 'Science', 'Arts')",
  "hodId": "uuid (optional)"
}
```

#### 7.2 Update Department
**Endpoint:** `PUT /api/admin/departments/{departmentId}`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "name": "string (optional)",
  "hodId": "uuid (optional)"
}
```

### 8. Academic Calendar Management

#### 8.1 Create Academic Calendar
**Endpoint:** `POST /api/admin/academic-sessions/{sessionId}/calendar`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "items": [
    {
      "title": "string",
      "startDate": "datetime",
      "endDate": "datetime (optional)"
    }
  ]
}
```

#### 8.2 Add Calendar Item
**Endpoint:** `POST /api/admin/academic-sessions/{sessionId}/calendar/items`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "title": "string",
  "startDate": "datetime",
  "endDate": "datetime (optional)"
}
```

#### 8.3 Update Calendar Item
**Endpoint:** `PUT /api/admin/academic-calendar-items/{itemId}`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "title": "string (optional)",
  "startDate": "datetime (optional)",
  "endDate": "datetime (optional)"
}
```

### 9. Subject Management

#### 9.1 Create Subject
**Endpoint:** `POST /api/admin/subjects`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "name": "string",
  "isElective": "boolean (default: false)",
  "departmentId": "uuid (optional)"
}
```

#### 9.2 Update Subject
**Endpoint:** `PUT /api/admin/subjects/{subjectId}`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "name": "string (optional)",
  "isElective": "boolean (optional)",
  "departmentId": "uuid (optional)"
}
```

### 10. Assessment Structure Management

#### 10.1 Create Assessment
**Endpoint:** `POST /api/admin/assessments`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "name": "string",
  "description": "string (optional)",
  "maxScore": "number"
}
```

**Validation:** Total maxScore for all assessments must sum to 100

#### 10.2 Update Assessment
**Endpoint:** `PUT /api/admin/assessments/{assessmentId}`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "maxScore": "number (optional)"
}
```

### 11. Grading Model Management

#### 11.1 Create/Update Grading Model
**Endpoint:** `POST /api/admin/grading-model`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "model": {
    "A": [70, 100],
    "B": [60, 69],
    "C": [50, 59],
    "D": [40, 49],
    "E": [30, 39],
    "F": [0, 29]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "schoolId": "uuid",
    "model": "json",
    "createdAt": "datetime"
  }
}
```

### 12. Teacher Assignments

#### 12.1 Assign Class Arm Teacher
**Endpoint:** `POST /api/admin/class-arms/{classArmId}/teachers`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "teacherId": "uuid"
}
```

#### 12.2 Assign Class Arm Subject Teacher
**Endpoint:** `POST /api/admin/class-arms/{classArmId}/subjects/{subjectId}/teachers`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "teacherId": "uuid"
}
```

#### 12.3 Appoint HOD
**Endpoint:** `POST /api/admin/departments/{departmentId}/hod`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "teacherId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "teacherId": "uuid",
    "departmentId": "uuid",
    "startDate": "datetime",
    "endDate": null
  }
}
```

### 13. Prefect Management

#### 13.1 Create Prefect
**Endpoint:** `POST /api/admin/prefects`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "studentId": "uuid",
  "role": "string (e.g., 'Class Captain', 'Head Boy')"
}
```

#### 13.2 Update Prefect
**Endpoint:** `PUT /api/admin/prefects/{prefectId}`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "role": "string"
}
```

### 14. Student Enrollment

#### 14.1 Enroll Students to Subject Term
**Endpoint:** `POST /api/admin/subject-terms/{subjectTermId}/students`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "studentIds": ["uuid", "uuid", "uuid"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enrolledCount": 3,
    "enrollments": [
      {
        "id": "uuid",
        "studentId": "uuid",
        "subjectTermId": "uuid",
        "totalScore": 0,
        "createdAt": "datetime"
      }
    ]
  }
}
```

### 15. List/Get Endpoints

#### 15.1 Get Teachers
**Endpoint:** `GET /api/admin/teachers`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `page`: `number (default: 1)`
- `limit`: `number (default: 20)`
- `search`: `string (optional)`

#### 15.2 Get Students
**Endpoint:** `GET /api/admin/students`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `classArmId`: `uuid (optional)`
- `page`: `number (default: 1)`
- `limit`: `number (default: 20)`
- `search`: `string (optional)`

#### 15.3 Get Levels
**Endpoint:** `GET /api/admin/levels`

**Headers:** `Authorization: Bearer {admin_token}`

#### 15.4 Get Class Arms
**Endpoint:** `GET /api/admin/class-arms`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `academicSessionId`: `uuid (optional)`
- `levelId`: `uuid (optional)`

#### 15.5 Get Departments
**Endpoint:** `GET /api/admin/departments`

**Headers:** `Authorization: Bearer {admin_token}`

#### 15.6 Get Subjects
**Endpoint:** `GET /api/admin/subjects`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `departmentId`: `uuid (optional)`
- `isElective`: `boolean (optional)`

#### 15.7 Get Assessments
**Endpoint:** `GET /api/admin/assessments`

**Headers:** `Authorization: Bearer {admin_token}`

#### 15.8 Get Grading Model
**Endpoint:** `GET /api/admin/grading-model`

**Headers:** `Authorization: Bearer {admin_token}`

### Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": "object (optional)"
  }
}
```

### Common Error Codes:
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `CONFLICT`: Resource already exists
- `ASSESSMENT_SCORE_SUM_ERROR`: Assessment scores don't sum to 100

### Authentication & Authorization

All endpoints require:
- Valid admin JWT token
- Admin must belong to the school they're managing
- Super admins can manage any school

This comprehensive API specification covers all the school admin operations you requested, with proper validation, error handling, and consistent response formats.

```json
{
  "academicYear": "string (e.g., '2024/2025')",
  "startDate": "datetime",
  "endDate": "datetime",
  "isCurrent": "boolean (optional, default: false)"
}
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "academicYear": "2024/2025",
    "startDate": "datetime",
    "endDate": "datetime",
    "isCurrent": false,
    "schoolId": "uuid",
    "createdAt": "datetime"
  }
}
```

```json
{
  "academicYear": "string (optional)",
  "startDate": "datetime (optional)",
  "endDate": "datetime (optional)",
  "isCurrent": "boolean (optional)"
}
```

```json
{
  "name": "string (e.g., 'First Term')",
  "academicSessionId": "uuid",
  "subjects": [
    {
      "subjectId": "uuid",
      "curriculum": {
        "items": [
          {
            "title": "string",
            "description": "string (optional)"
          }
        ]
      }
    }
  ]
}
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "First Term",
    "academicSessionId": "uuid",
    "subjectTerms": [
      {
        "id": "uuid",
        "subjectId": "uuid",
        "curriculum": {
          "id": "uuid",
          "items": [
            {
              "id": "uuid",
              "title": "string"
            }
          ]
        }
      }
    ],
    "createdAt": "datetime"
  }
}
```

```json
{
  "subjectId": "uuid",
  "curriculum": {
    "items": [
      {
        "title": "string",
        "description": "string (optional)"
      }
    ]
  }
}
```

```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string (optional)",
  "password": "string",
  "dateOfBirth": "datetime (optional)",
  "addressId": "uuid (optional)",
  "avatarUrl": "string (optional)"
}
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "teacherNo": "string (auto-generated)",
    "user": {
      "id": "uuid",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "phone": "string"
    },
    "createdAt": "datetime"
  }
}
```

```json
{
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "email": "string (optional)",
  "phone": "string (optional)",
  "dateOfBirth": "datetime (optional)",
  "addressId": "uuid (optional)",
  "avatarUrl": "string (optional)"
}
```

```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string (optional)",
  "phone": "string (optional)",
  "password": "string",
  "dateOfBirth": "datetime (optional)",
  "addressId": "uuid (optional)",
  "avatarUrl": "string (optional)",
  "classArmId": "uuid",
  "guardianId": "uuid (optional)",
  "admissionNo": "string (optional)",
  "admissionDate": "datetime (optional)"
}
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "studentNo": "string (auto-generated)",
    "admissionNo": "string",
    "admissionDate": "datetime",
    "classArmId": "uuid",
    "guardianId": "uuid",
    "user": {
      "id": "uuid",
      "firstName": "string",
      "lastName": "string",
      "email": "string"
    },
    "createdAt": "datetime"
  }
}
```

```json
{
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "email": "string (optional)",
  "phone": "string (optional)",
  "dateOfBirth": "datetime (optional)",
  "addressId": "uuid (optional)",
  "avatarUrl": "string (optional)",
  "classArmId": "uuid (optional)",
  "guardianId": "uuid (optional)",
  "admissionNo": "string (optional)"
}
```

```json
{
  "name": "string (e.g., 'JSS1', 'SS1')"
}
```

```json
{
  "name": "string"
}
```

```json
{
  "name": "string (e.g., 'JSS1A')",
  "academicSessionId": "uuid",
  "levelId": "uuid",
  "departmentId": "uuid (optional)"
}
```

```json
{
  "name": "string (optional)",
  "levelId": "uuid (optional)",
  "departmentId": "uuid (optional)"
}
```

```json
{
  "name": "string (e.g., 'Science', 'Arts')",
  "hodId": "uuid (optional)"
}
```

```json
{
  "name": "string (optional)",
  "hodId": "uuid (optional)"
}
```

```json
{
  "items": [
    {
      "title": "string",
      "startDate": "datetime",
      "endDate": "datetime (optional)"
    }
  ]
}
```

```json
{
  "title": "string",
  "startDate": "datetime",
  "endDate": "datetime (optional)"
}
```

```json
{
  "title": "string (optional)",
  "startDate": "datetime (optional)",
  "endDate": "datetime (optional)"
}
```

```json
{
  "name": "string",
  "isElective": "boolean (default: false)",
  "departmentId": "uuid (optional)"
}
```

```json
{
  "name": "string (optional)",
  "isElective": "boolean (optional)",
  "departmentId": "uuid (optional)"
}
```

```json
{
  "name": "string",
  "description": "string (optional)",
  "maxScore": "number"
}
```

```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "maxScore": "number (optional)"
}
```

```json
{
  "model": {
    "A": [70, 100],
    "B": [60, 69],
    "C": [50, 59],
    "D": [40, 49],
    "E": [30, 39],
    "F": [0, 29]
  }
}
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "schoolId": "uuid",
    "model": "json",
    "createdAt": "datetime"
  }
}
```

```json
{
  "teacherId": "uuid"
}
```

```json
{
  "teacherId": "uuid"
}
```

```json
{
  "teacherId": "uuid"
}
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "teacherId": "uuid",
    "departmentId": "uuid",
    "startDate": "datetime",
    "endDate": null
  }
}
```

```json
{
  "studentId": "uuid",
  "role": "string (e.g., 'Class Captain', 'Head Boy')"
}
```

```json
{
  "role": "string"
}
```

```json
{
  "studentIds": ["uuid", "uuid", "uuid"]
}
```

```json
{
  "success": true,
  "data": {
    "enrolledCount": 3,
    "enrollments": [
      {
        "id": "uuid",
        "studentId": "uuid",
        "subjectTermId": "uuid",
        "totalScore": 0,
        "createdAt": "datetime"
      }
    ]
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": "object (optional)"
  }
}
```

