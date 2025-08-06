# Create API specifications for school sign up
_Exported on 7/29/2025 at 18:57:12 GMT+1 from Cursor (1.2.4)_

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

---

**User**

great!. now look at this UI.

define required api endpoint specs for the data there

---

**Cursor**

Based on the UI dashboard shown, here are the API endpoint specifications needed to populate the data:

## Dashboard API Endpoints

### 1. Dashboard Overview Data

#### 1.1 Get Dashboard Statistics
**Endpoint:** `GET /api/admin/dashboard/overview`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `date`: `string (optional, format: YYYY-MM-DD, default: today)`

**Response:**
```json
{
  "success": true,
  "data": {
    "students": {
      "total": 1000,
      "growth": {
        "percentage": 24,
        "change": "+11.02%",
        "period": "last month"
      }
    },
    "teachers": {
      "total": 20,
      "growth": {
        "percentage": 24,
        "change": "+11.02%",
        "period": "last month"
      }
    },
    "subjects": {
      "total": 20,
      "growth": {
        "percentage": 24,
        "change": "+11.02%",
        "period": "last month"
      }
    }
  }
}
```

### 2. Student Attendance Data

#### 2.1 Get Student Attendance Statistics
**Endpoint:** `GET /api/admin/dashboard/attendance`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `date`: `string (optional, format: YYYY-MM-DD, default: today)`
- `academicSessionId`: `uuid (optional)`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalStudents": 1000,
    "present": 620,
    "absent": 380,
    "attendanceRate": 62,
    "growth": {
      "percentage": 11.02,
      "change": "+11.02%"
    },
    "breakdown": {
      "present": {
        "count": 620,
        "percentage": 62
      },
      "absent": {
        "count": 380,
        "percentage": 38
      }
    }
  }
}
```

### 3. Academic Performance Data

#### 3.1 Get Academic Performance Graph
**Endpoint:** `GET /api/admin/dashboard/academic-performance`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `academicYear`: `string (optional, default: current year)`
- `semester`: `string (optional, 1st | 2nd | 3rd)`

**Response:**
```json
{
  "success": true,
  "data": {
    "academicYear": "2021-2022",
    "availableYears": ["2020-2021", "2021-2022", "2022-2023"],
    "performance": {
      "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      "datasets": [
        {
          "label": "1st Semester",
          "data": [800, 820, 850, 880, 900, 920, 950, 980, 1000, 1020, 1050, 1080],
          "color": "#2C3E50"
        },
        {
          "label": "2nd Semester", 
          "data": [750, 780, 810, 840, 870, 900, 930, 960, 990, 1020, 1050, 1080],
          "color": "#7F8C8D"
        },
        {
          "label": "3rd Semester",
          "data": [700, 730, 760, 790, 820, 850, 880, 910, 940, 970, 1000, 1030],
          "color": "#BDC3C7"
        }
      ]
    }
  }
}
```

### 4. Calendar and Events

#### 4.1 Get Calendar Data
**Endpoint:** `GET /api/admin/dashboard/calendar`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `month`: `number (optional, 1-12)`
- `year`: `number (optional)`

**Response:**
```json
{
  "success": true,
  "data": {
    "currentMonth": {
      "month": 8,
      "year": 2023,
      "monthName": "August"
    },
    "calendar": {
      "days": [
        {
          "date": 1,
          "dayOfWeek": "S",
          "isCurrentMonth": true,
          "hasEvents": false
        },
        {
          "date": 5,
          "dayOfWeek": "T", 
          "isCurrentMonth": true,
          "hasEvents": true,
          "isSelected": true
        },
        {
          "date": 7,
          "dayOfWeek": "T",
          "isCurrentMonth": true,
          "hasEvents": true
        },
        {
          "date": 10,
          "dayOfWeek": "S",
          "isCurrentMonth": true,
          "hasEvents": true
        },
        {
          "date": 17,
          "dayOfWeek": "M",
          "isCurrentMonth": true,
          "hasEvents": true
        },
        {
          "date": 22,
          "dayOfWeek": "S",
          "isCurrentMonth": true,
          "hasEvents": true
        }
      ]
    }
  }
}
```

#### 4.2 Get Upcoming Events
**Endpoint:** `GET /api/admin/dashboard/upcoming-events`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `limit`: `number (optional, default: 5)`
- `days`: `number (optional, default: 30)`

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "uuid",
        "title": "Cultural Day",
        "description": "Annual cultural celebration",
        "startDate": "2025-09-27T00:00:00Z",
        "endDate": "2025-10-05T23:59:59Z",
        "type": "CULTURAL",
        "icon": "calculator",
        "isRecurring": true,
        "academicSessionId": "uuid"
      }
    ]
  }
}
```

### 5. Search Functionality

#### 5.1 Search Students
**Endpoint:** `GET /api/admin/students/search`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `q`: `string (required, student name)`
- `limit`: `number (optional, default: 10)`

**Response:**
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "uuid",
        "studentNo": "STU001",
        "firstName": "John",
        "lastName": "Doe",
        "classArm": {
          "id": "uuid",
          "name": "JSS1A"
        },
        "avatarUrl": "string (optional)"
      }
    ],
    "total": 1
  }
}
```

### 6. Notifications

#### 6.1 Get Notifications
**Endpoint:** `GET /api/admin/notifications`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `page`: `number (optional, default: 1)`
- `limit`: `number (optional, default: 20)`
- `unreadOnly`: `boolean (optional, default: false)`

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "title": "New Student Registration",
        "message": "John Doe has been registered in JSS1A",
        "type": "STUDENT_REGISTRATION",
        "isRead": false,
        "createdAt": "datetime",
        "actionUrl": "/admin/students/uuid"
      }
    ],
    "unreadCount": 5,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

#### 6.2 Mark Notification as Read
**Endpoint:** `PUT /api/admin/notifications/{notificationId}/read`

**Headers:** `Authorization: Bearer {admin_token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isRead": true,
    "updatedAt": "datetime"
  }
}
```

### 7. User Profile Data

#### 7.1 Get Current User Profile
**Endpoint:** `GET /api/admin/profile`

**Headers:** `Authorization: Bearer {admin_token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "Michael",
    "lastName": "Clinton",
    "email": "michael.clinton@school.com",
    "phone": "string (optional)",
    "avatarUrl": "string",
    "role": "Teacher",
    "school": {
      "id": "uuid",
      "name": "Saint James Int",
      "code": "SJI"
    },
    "permissions": ["READ_STUDENTS", "WRITE_STUDENTS", "READ_TEACHERS"]
  }
}
```

### 8. School Information

#### 8.1 Get School Details
**Endpoint:** `GET /api/admin/school`

**Headers:** `Authorization: Bearer {admin_token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Saint James Int",
    "code": "SJI",
    "tagline": "Growth & Excellence in Everything",
    "logo": "string (url)",
    "address": {
      "country": "string",
      "state": "string",
      "city": "string",
      "street1": "string"
    },
    "contactInfo": {
      "email": "string",
      "phone": "string",
      "website": "string (optional)"
    }
  }
}
```

### 9. Real-time Updates

#### 9.1 Get Dashboard Updates (WebSocket)
**Endpoint:** `WS /api/admin/dashboard/updates`

**Headers:** `Authorization: Bearer {admin_token}`

**Events:**
```json
{
  "type": "ATTENDANCE_UPDATE",
  "data": {
    "present": 625,
    "absent": 375,
    "total": 1000,
    "timestamp": "datetime"
  }
}
```

### 10. Export Dashboard Data

#### 10.1 Export Dashboard Report
**Endpoint:** `GET /api/admin/dashboard/export`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `format`: `string (PDF | CSV | EXCEL)`
- `dateRange`: `string (optional, format: YYYY-MM-DD,YYYY-MM-DD)`
- `includeCharts`: `boolean (optional, default: true)`

**Response:** File download with dashboard data

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

### Common Dashboard Error Codes:
- `INVALID_DATE_RANGE`: Invalid date range provided
- `NO_DATA_AVAILABLE`: No data available for the requested period
- `INSUFFICIENT_PERMISSIONS`: User doesn't have permission to view dashboard data
- `REAL_TIME_CONNECTION_FAILED`: WebSocket connection failed

### Performance Considerations

- Dashboard endpoints should be cached (Redis) for 5-15 minutes
- Real-time updates via WebSocket for live attendance data
- Pagination for large datasets
- Aggregated data queries for better performance
- Background jobs for calculating growth percentages and trends

This comprehensive API specification covers all the data needed to populate the dashboard UI shown in the image, including statistics, charts, calendar, events, and user interactions.

```json
{
  "success": true,
  "data": {
    "students": {
      "total": 1000,
      "growth": {
        "percentage": 24,
        "change": "+11.02%",
        "period": "last month"
      }
    },
    "teachers": {
      "total": 20,
      "growth": {
        "percentage": 24,
        "change": "+11.02%",
        "period": "last month"
      }
    },
    "subjects": {
      "total": 20,
      "growth": {
        "percentage": 24,
        "change": "+11.02%",
        "period": "last month"
      }
    }
  }
}
```

```json
{
  "success": true,
  "data": {
    "totalStudents": 1000,
    "present": 620,
    "absent": 380,
    "attendanceRate": 62,
    "growth": {
      "percentage": 11.02,
      "change": "+11.02%"
    },
    "breakdown": {
      "present": {
        "count": 620,
        "percentage": 62
      },
      "absent": {
        "count": 380,
        "percentage": 38
      }
    }
  }
}
```

```json
{
  "success": true,
  "data": {
    "academicYear": "2021-2022",
    "availableYears": ["2020-2021", "2021-2022", "2022-2023"],
    "performance": {
      "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      "datasets": [
        {
          "label": "1st Semester",
          "data": [800, 820, 850, 880, 900, 920, 950, 980, 1000, 1020, 1050, 1080],
          "color": "#2C3E50"
        },
        {
          "label": "2nd Semester", 
          "data": [750, 780, 810, 840, 870, 900, 930, 960, 990, 1020, 1050, 1080],
          "color": "#7F8C8D"
        },
        {
          "label": "3rd Semester",
          "data": [700, 730, 760, 790, 820, 850, 880, 910, 940, 970, 1000, 1030],
          "color": "#BDC3C7"
        }
      ]
    }
  }
}
```

```json
{
  "success": true,
  "data": {
    "currentMonth": {
      "month": 8,
      "year": 2023,
      "monthName": "August"
    },
    "calendar": {
      "days": [
        {
          "date": 1,
          "dayOfWeek": "S",
          "isCurrentMonth": true,
          "hasEvents": false
        },
        {
          "date": 5,
          "dayOfWeek": "T", 
          "isCurrentMonth": true,
          "hasEvents": true,
          "isSelected": true
        },
        {
          "date": 7,
          "dayOfWeek": "T",
          "isCurrentMonth": true,
          "hasEvents": true
        },
        {
          "date": 10,
          "dayOfWeek": "S",
          "isCurrentMonth": true,
          "hasEvents": true
        },
        {
          "date": 17,
          "dayOfWeek": "M",
          "isCurrentMonth": true,
          "hasEvents": true
        },
        {
          "date": 22,
          "dayOfWeek": "S",
          "isCurrentMonth": true,
          "hasEvents": true
        }
      ]
    }
  }
}
```

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "uuid",
        "title": "Cultural Day",
        "description": "Annual cultural celebration",
        "startDate": "2025-09-27T00:00:00Z",
        "endDate": "2025-10-05T23:59:59Z",
        "type": "CULTURAL",
        "icon": "calculator",
        "isRecurring": true,
        "academicSessionId": "uuid"
      }
    ]
  }
}
```

```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "uuid",
        "studentNo": "STU001",
        "firstName": "John",
        "lastName": "Doe",
        "classArm": {
          "id": "uuid",
          "name": "JSS1A"
        },
        "avatarUrl": "string (optional)"
      }
    ],
    "total": 1
  }
}
```

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "title": "New Student Registration",
        "message": "John Doe has been registered in JSS1A",
        "type": "STUDENT_REGISTRATION",
        "isRead": false,
        "createdAt": "datetime",
        "actionUrl": "/admin/students/uuid"
      }
    ],
    "unreadCount": 5,
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
    "isRead": true,
    "updatedAt": "datetime"
  }
}
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "Michael",
    "lastName": "Clinton",
    "email": "michael.clinton@school.com",
    "phone": "string (optional)",
    "avatarUrl": "string",
    "role": "Teacher",
    "school": {
      "id": "uuid",
      "name": "Saint James Int",
      "code": "SJI"
    },
    "permissions": ["READ_STUDENTS", "WRITE_STUDENTS", "READ_TEACHERS"]
  }
}
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Saint James Int",
    "code": "SJI",
    "tagline": "Growth & Excellence in Everything",
    "logo": "string (url)",
    "address": {
      "country": "string",
      "state": "string",
      "city": "string",
      "street1": "string"
    },
    "contactInfo": {
      "email": "string",
      "phone": "string",
      "website": "string (optional)"
    }
  }
}
```

```json
{
  "type": "ATTENDANCE_UPDATE",
  "data": {
    "present": 625,
    "absent": 375,
    "total": 1000,
    "timestamp": "datetime"
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

---

**User**

great!. now look at this UI.

define required api endpoint specs for the data there

---

**Cursor**

Based on the Classes dashboard UI shown, here are the API endpoint specifications needed to populate the data:

## API Endpoint Specifications for Classes Dashboard

### 1. Get List of Classes

**Endpoint:** `GET /api/admin/classes`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `page`: `integer` (optional, default: 1)
- `limit`: `integer` (optional, default: 12)
- `search`: `string` (optional) - Search by class name, teacher name
- `levelId`: `uuid` (optional) - Filter by academic level
- `academicSessionId`: `uuid` (optional) - Filter by academic session
- `termId`: `uuid` (optional) - Filter by term

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "JSS 2 Ruby",
      "level": {
        "id": "uuid",
        "name": "JSS 2"
      },
      "classArm": {
        "id": "uuid",
        "name": "Ruby"
      },
      "classArmTeacher": {
        "id": "uuid",
        "firstName": "Grace",
        "lastName": "Standford",
        "avatarUrl": "string (optional)"
      },
      "studentCount": 23,
      "academicSession": {
        "id": "uuid",
        "academicYear": "2024/2025"
      },
      "department": {
        "id": "uuid",
        "name": "Science"
      }
    }
  ],
  "pagination": {
    "totalItems": 120,
    "totalPages": 10,
    "currentPage": 1,
    "itemsPerPage": 12
  }
}
```

### 2. Search Students

**Endpoint:** `GET /api/admin/students/search`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `query`: `string` (required) - Search term
- `page`: `integer` (optional, default: 1)
- `limit`: `integer` (optional, default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "admissionNumber": "SJD001",
      "currentClassArm": {
        "id": "uuid",
        "name": "JSS 2 Ruby"
      },
      "avatarUrl": "string (optional)"
    }
  ],
  "pagination": {
    "totalItems": 50,
    "totalPages": 5,
    "currentPage": 1,
    "itemsPerPage": 10
  }
}
```

### 3. Get Top Class Champions

**Endpoint:** `GET /api/admin/academic-performance/top-classes`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `academicSessionId`: `uuid` (optional) - Defaults to current active session
- `termId`: `uuid` (optional) - Defaults to current active term
- `limitPerLevel`: `integer` (optional, default: 3)

**Response:**
```json
{
  "success": true,
  "data": {
    "academicSession": "2024/2025",
    "term": "First Term",
    "championsByLevel": [
      {
        "level": {
          "id": "uuid",
          "name": "JSS 1"
        },
        "champions": [
          {
            "position": 1,
            "classArm": {
              "id": "uuid",
              "name": "JSS 1 Gold"
            },
            "classArmTeacher": {
              "id": "uuid",
              "firstName": "Grace",
              "lastName": "Standford"
            },
            "averageScore": 95.5,
            "totalStudents": 25,
            "performanceMetrics": {
              "excellent": 15,
              "good": 8,
              "average": 2,
              "belowAverage": 0
            }
          },
          {
            "position": 2,
            "classArm": {
              "id": "uuid",
              "name": "JSS 1 Silver"
            },
            "classArmTeacher": {
              "id": "uuid",
              "firstName": "John",
              "lastName": "Doe"
            },
            "averageScore": 92.1,
            "totalStudents": 23,
            "performanceMetrics": {
              "excellent": 12,
              "good": 9,
              "average": 2,
              "belowAverage": 0
            }
          },
          {
            "position": 3,
            "classArm": {
              "id": "uuid",
              "name": "JSS 1 Bronze"
            },
            "classArmTeacher": {
              "id": "uuid",
              "firstName": "Jane",
              "lastName": "Smith"
            },
            "averageScore": 89.7,
            "totalStudents": 24,
            "performanceMetrics": {
              "excellent": 10,
              "good": 11,
              "average": 3,
              "belowAverage": 0
            }
          }
        ]
      },
      {
        "level": {
          "id": "uuid",
          "name": "JSS 2"
        },
        "champions": []
      },
      {
        "level": {
          "id": "uuid",
          "name": "JSS 3"
        },
        "champions": []
      },
      {
        "level": {
          "id": "uuid",
          "name": "SS 1 Science"
        },
        "champions": []
      },
      {
        "level": {
          "id": "uuid",
          "name": "SS 1 Commercial"
        },
        "champions": []
      },
      {
        "level": {
          "id": "uuid",
          "name": "SS 1 Art"
        },
        "champions": []
      }
    ]
  }
}
```

### 4. Get Class Details

**Endpoint:** `GET /api/admin/classes/{classArmId}`

**Headers:** `Authorization: Bearer {admin_token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "JSS 2 Ruby",
    "level": {
      "id": "uuid",
      "name": "JSS 2"
    },
    "classArm": {
      "id": "uuid",
      "name": "Ruby"
    },
    "academicSession": {
      "id": "uuid",
      "academicYear": "2024/2025"
    },
    "department": {
      "id": "uuid",
      "name": "Science"
    },
    "classArmTeacher": {
      "id": "uuid",
      "firstName": "Grace",
      "lastName": "Standford",
      "email": "grace.standford@school.com",
      "phone": "string",
      "avatarUrl": "string"
    },
    "students": {
      "total": 23,
      "male": 12,
      "female": 11
    },
    "subjects": [
      {
        "id": "uuid",
        "name": "Mathematics",
        "teacher": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    ],
    "performance": {
      "averageScore": 85.2,
      "attendanceRate": 92.5,
      "topStudent": {
        "id": "uuid",
        "firstName": "Alice",
        "lastName": "Johnson",
        "averageScore": 95.8
      }
    }
  }
}
```

### 5. Get Academic Levels

**Endpoint:** `GET /api/admin/levels`

**Headers:** `Authorization: Bearer {admin_token}`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "JSS 1",
      "classArms": [
        {
          "id": "uuid",
          "name": "Gold",
          "studentCount": 25
        },
        {
          "id": "uuid",
          "name": "Silver",
          "studentCount": 23
        }
      ]
    },
    {
      "id": "uuid",
      "name": "JSS 2",
      "classArms": [
        {
          "id": "uuid",
          "name": "Ruby",
          "studentCount": 23
        }
      ]
    }
  ]
}
```

### 6. Get Academic Sessions

**Endpoint:** `GET /api/admin/academic-sessions`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `isCurrent`: `boolean` (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "academicYear": "2024/2025",
      "startDate": "datetime",
      "endDate": "datetime",
      "isCurrent": true,
      "terms": [
        {
          "id": "uuid",
          "name": "First Term"
        },
        {
          "id": "uuid",
          "name": "Second Term"
        }
      ]
    }
  ]
}
```

### 7. Get Class Performance Analytics

**Endpoint:** `GET /api/admin/classes/{classArmId}/performance`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `termId`: `uuid` (optional)
- `academicSessionId`: `uuid` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "classArmId": "uuid",
    "academicSession": "2024/2025",
    "term": "First Term",
    "overallPerformance": {
      "averageScore": 85.2,
      "highestScore": 98.5,
      "lowestScore": 65.0,
      "passRate": 95.7
    },
    "subjectPerformance": [
      {
        "subjectId": "uuid",
        "subjectName": "Mathematics",
        "averageScore": 88.5,
        "teacher": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    ],
    "attendance": {
      "totalDays": 90,
      "averageAttendance": 92.5,
      "attendanceTrend": [
        {
          "date": "2024-09-01",
          "present": 22,
          "absent": 1,
          "total": 23
        }
      ]
    },
    "topStudents": [
      {
        "id": "uuid",
        "firstName": "Alice",
        "lastName": "Johnson",
        "averageScore": 95.8,
        "rank": 1
      }
    ]
  }
}
```

### 8. Export Class Data

**Endpoint:** `GET /api/admin/classes/{classArmId}/export`

**Headers:** `Authorization: Bearer {admin_token}`

**Query Parameters:**
- `format`: `string` (PDF | CSV | EXCEL)
- `includePerformance`: `boolean` (optional, default: true)
- `includeAttendance`: `boolean` (optional, default: true)

**Response:** File download with class data

### Error Responses

```json
{
  "success": false,
  "error": {
    "code": "CLASS_NOT_FOUND",
    "message": "Class not found",
    "details": {
      "classArmId": "uuid"
    }
  }
}
```

### Common Error Codes:
- `CLASS_NOT_FOUND`: Class arm not found
- `INSUFFICIENT_PERMISSIONS`: User doesn't have permission to view class data
- `NO_PERFORMANCE_DATA`: No performance data available for the specified period
- `INVALID_ACADEMIC_SESSION`: Invalid academic session provided

### Performance Considerations

- Cache class lists and performance data for 10-15 minutes
- Use database indexes on frequently queried fields (levelId, academicSessionId, termId)
- Implement pagination for large datasets
- Aggregate performance calculations in background jobs
- Use database views for complex performance calculations

This comprehensive API specification covers all the data needed to populate the Classes dashboard UI, including class listings, search functionality, top performers, and detailed analytics.

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "JSS 2 Ruby",
      "level": {
        "id": "uuid",
        "name": "JSS 2"
      },
      "classArm": {
        "id": "uuid",
        "name": "Ruby"
      },
      "classArmTeacher": {
        "id": "uuid",
        "firstName": "Grace",
        "lastName": "Standford",
        "avatarUrl": "string (optional)"
      },
      "studentCount": 23,
      "academicSession": {
        "id": "uuid",
        "academicYear": "2024/2025"
      },
      "department": {
        "id": "uuid",
        "name": "Science"
      }
    }
  ],
  "pagination": {
    "totalItems": 120,
    "totalPages": 10,
    "currentPage": 1,
    "itemsPerPage": 12
  }
}
```

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "admissionNumber": "SJD001",
      "currentClassArm": {
        "id": "uuid",
        "name": "JSS 2 Ruby"
      },
      "avatarUrl": "string (optional)"
    }
  ],
  "pagination": {
    "totalItems": 50,
    "totalPages": 5,
    "currentPage": 1,
    "itemsPerPage": 10
  }
}
```

```json
{
  "success": true,
  "data": {
    "academicSession": "2024/2025",
    "term": "First Term",
    "championsByLevel": [
      {
        "level": {
          "id": "uuid",
          "name": "JSS 1"
        },
        "champions": [
          {
            "position": 1,
            "classArm": {
              "id": "uuid",
              "name": "JSS 1 Gold"
            },
            "classArmTeacher": {
              "id": "uuid",
              "firstName": "Grace",
              "lastName": "Standford"
            },
            "averageScore": 95.5,
            "totalStudents": 25,
            "performanceMetrics": {
              "excellent": 15,
              "good": 8,
              "average": 2,
              "belowAverage": 0
            }
          },
          {
            "position": 2,
            "classArm": {
              "id": "uuid",
              "name": "JSS 1 Silver"
            },
            "classArmTeacher": {
              "id": "uuid",
              "firstName": "John",
              "lastName": "Doe"
            },
            "averageScore": 92.1,
            "totalStudents": 23,
            "performanceMetrics": {
              "excellent": 12,
              "good": 9,
              "average": 2,
              "belowAverage": 0
            }
          },
          {
            "position": 3,
            "classArm": {
              "id": "uuid",
              "name": "JSS 1 Bronze"
            },
            "classArmTeacher": {
              "id": "uuid",
              "firstName": "Jane",
              "lastName": "Smith"
            },
            "averageScore": 89.7,
            "totalStudents": 24,
            "performanceMetrics": {
              "excellent": 10,
              "good": 11,
              "average": 3,
              "belowAverage": 0
            }
          }
        ]
      },
      {
        "level": {
          "id": "uuid",
          "name": "JSS 2"
        },
        "champions": []
      },
      {
        "level": {
          "id": "uuid",
          "name": "JSS 3"
        },
        "champions": []
      },
      {
        "level": {
          "id": "uuid",
          "name": "SS 1 Science"
        },
        "champions": []
      },
      {
        "level": {
          "id": "uuid",
          "name": "SS 1 Commercial"
        },
        "champions": []
      },
      {
        "level": {
          "id": "uuid",
          "name": "SS 1 Art"
        },
        "champions": []
      }
    ]
  }
}
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "JSS 2 Ruby",
    "level": {
      "id": "uuid",
      "name": "JSS 2"
    },
    "classArm": {
      "id": "uuid",
      "name": "Ruby"
    },
    "academicSession": {
      "id": "uuid",
      "academicYear": "2024/2025"
    },
    "department": {
      "id": "uuid",
      "name": "Science"
    },
    "classArmTeacher": {
      "id": "uuid",
      "firstName": "Grace",
      "lastName": "Standford",
      "email": "grace.standford@school.com",
      "phone": "string",
      "avatarUrl": "string"
    },
    "students": {
      "total": 23,
      "male": 12,
      "female": 11
    },
    "subjects": [
      {
        "id": "uuid",
        "name": "Mathematics",
        "teacher": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    ],
    "performance": {
      "averageScore": 85.2,
      "attendanceRate": 92.5,
      "topStudent": {
        "id": "uuid",
        "firstName": "Alice",
        "lastName": "Johnson",
        "averageScore": 95.8
      }
    }
  }
}
```

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "JSS 1",
      "classArms": [
        {
          "id": "uuid",
          "name": "Gold",
          "studentCount": 25
        },
        {
          "id": "uuid",
          "name": "Silver",
          "studentCount": 23
        }
      ]
    },
    {
      "id": "uuid",
      "name": "JSS 2",
      "classArms": [
        {
          "id": "uuid",
          "name": "Ruby",
          "studentCount": 23
        }
      ]
    }
  ]
}
```

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "academicYear": "2024/2025",
      "startDate": "datetime",
      "endDate": "datetime",
      "isCurrent": true,
      "terms": [
        {
          "id": "uuid",
          "name": "First Term"
        },
        {
          "id": "uuid",
          "name": "Second Term"
        }
      ]
    }
  ]
}
```

```json
{
  "success": true,
  "data": {
    "classArmId": "uuid",
    "academicSession": "2024/2025",
    "term": "First Term",
    "overallPerformance": {
      "averageScore": 85.2,
      "highestScore": 98.5,
      "lowestScore": 65.0,
      "passRate": 95.7
    },
    "subjectPerformance": [
      {
        "subjectId": "uuid",
        "subjectName": "Mathematics",
        "averageScore": 88.5,
        "teacher": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    ],
    "attendance": {
      "totalDays": 90,
      "averageAttendance": 92.5,
      "attendanceTrend": [
        {
          "date": "2024-09-01",
          "present": 22,
          "absent": 1,
          "total": 23
        }
      ]
    },
    "topStudents": [
      {
        "id": "uuid",
        "firstName": "Alice",
        "lastName": "Johnson",
        "averageScore": 95.8,
        "rank": 1
      }
    ]
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "CLASS_NOT_FOUND",
    "message": "Class not found",
    "details": {
      "classArmId": "uuid"
    }
  }
}
```

