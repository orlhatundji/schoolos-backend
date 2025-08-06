# School Signup System

This document describes the complete school signup system implementation for the School Management Backend.

## Overview

The school signup system allows schools to submit signup requests for platform access. System admins can review and approve/reject these requests, after which school accounts are automatically created with admin credentials sent to the contact person.

## Database Schema

### New Enums

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
  MIXED
}
```

### New Model

```prisma
model SchoolSignupRequest {
  id              String              @id @default(uuid())
  schoolName      String
  schoolCode      String              @unique
  contactPerson   Json                // Store contact person details
  address         Json                // Store address details
  schoolDetails   Json                // Store school details
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
```

## API Endpoints

### 1. School Signup Request (Public)

**POST** `/api/schools/signup`

Allows schools to submit signup requests.

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
    "type": "PRIMARY | SECONDARY | MIXED",
    "capacity": "number (optional)",
    "website": "string (optional)",
    "description": "string (optional)"
  }
}
```

**Response:**
```json
{
  "status": 201,
  "message": "School signup request created successfully",
  "data": {
    "id": "uuid",
    "schoolName": "string",
    "schoolCode": "string",
    "contactPerson": {...},
    "address": {...},
    "schoolDetails": {...},
    "status": "PENDING",
    "submittedAt": "datetime",
    "createdAt": "datetime",
    "updatedAt": "datetime"
  }
}
```

### 2. System Admin Login

**POST** `/api/system-admin/login`

Allows system admins to login.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "status": 200,
  "message": "Login successful",
  "data": {
    "tokens": {
      "accessToken": "string",
      "refreshToken": "string"
    },
    "admin": {
      "id": "uuid",
      "isSuper": true,
      "user": {
        "id": "uuid",
        "email": "string",
        "firstName": "string",
        "lastName": "string"
      }
    }
  }
}
```

### 3. Get All Signup Requests (System Admin)

**GET** `/api/system-admin/school-signup-requests`

**Headers:** `Authorization: Bearer {admin_token}`

**Response:**
```json
{
  "status": 200,
  "message": "School signup request retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "schoolName": "string",
      "schoolCode": "string",
      "contactPerson": {...},
      "address": {...},
      "schoolDetails": {...},
      "status": "PENDING",
      "submittedAt": "datetime",
      "reviewedAt": "datetime",
      "reviewerId": "uuid",
      "notes": "string",
      "rejectionReason": "string",
      "createdAt": "datetime",
      "updatedAt": "datetime",
      "reviewer": {
        "id": "uuid",
        "user": {
          "id": "uuid",
          "firstName": "string",
          "lastName": "string",
          "email": "string"
        }
      }
    }
  ]
}
```

### 4. Get Single Signup Request (System Admin)

**GET** `/api/system-admin/school-signup-requests/{requestId}`

**Headers:** `Authorization: Bearer {admin_token}`

**Response:** Same as above but for a single request.

### 5. Update School Signup Request (System Admin)

**POST** `/api/system-admin/school-signup-requests/{requestId}/update`

**Headers:** `Authorization: Bearer {admin_token}`

**Request Body:**
```json
{
  "action": "approve" | "reject",
  "notes": "string (optional)",
  "rejectionReason": "string (required when action is reject)"
}
```

**Response (Approve):**
```json
{
  "status": 200,
  "message": "School account created successfully. Admin credentials sent to the contact person.",
  "data": {
    "requestId": "uuid",
    "status": "APPROVED",
    "schoolId": "uuid",
    "schoolCode": "string",
    "adminUserId": "uuid",
    "approvedAt": "datetime",
    "message": "School account created successfully. Admin credentials sent to the contact person."
  }
}
```

**Response (Reject):**
```json
{
  "status": 200,
  "message": "School signup request rejected successfully",
  "data": {
    "requestId": "uuid",
    "status": "REJECTED",
    "message": "School signup request rejected successfully"
  }
}
```

## Implementation Details

### File Structure

```
src/components/schools/
├── school-signup/
│   ├── dto/
│   │   ├── create-school-signup.dto.ts
│   │   ├── update-school-signup-status.dto.ts
│   │   └── index.ts
│   ├── results/
│   │   ├── school-signup-result.ts
│   │   ├── messages.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── school-signup.ts
│   │   └── index.ts
│   ├── school-signup.repository.ts
│   ├── school-signup.service.ts
│   ├── school-signup.controller.ts
│   └── system-admin-signup.controller.ts
```

### Key Features

1. **Public Signup Endpoint**: Schools can submit signup requests without authentication
2. **System Admin Authentication**: Dedicated login for system admins
3. **Request Management**: System admins can view and manage all signup requests
4. **Approval Process**: When approved, automatically creates:
   - School record
   - Address record
   - Admin user account
   - Admin record
5. **Email Notifications**: Sends credentials to contact person on approval
6. **Rejection Handling**: Sends rejection email with reason
7. **Data Validation**: Comprehensive validation for all inputs
8. **Transaction Safety**: Uses database transactions for data consistency

### Business Logic

1. **Signup Request Creation**:
   - Validates school code uniqueness
   - Stores all data as JSON for flexibility
   - Sets status to PENDING

2. **Approval Process**:
   - Creates address record
   - Creates school record with primary address
   - Generates secure admin password
   - Creates admin user with hashed password
   - Creates admin record with super admin privileges
   - Updates signup request status
   - Sends email with credentials

3. **Rejection Process**:
   - Updates signup request status
   - Stores rejection reason
   - Sends rejection email

### Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt
2. **JWT Authentication**: System admin endpoints require valid JWT tokens
3. **Input Validation**: Comprehensive validation using class-validator
4. **Transaction Safety**: Database operations use transactions
5. **Error Handling**: Proper error handling and logging

### Testing

To test the system:

1. **Create System Admin**:
   ```bash
   npx ts-node prisma/seed-system-admin.ts
   ```

2. **Test School Signup**:
   ```bash
   curl -X POST http://localhost:3000/api/schools/signup \
     -H "Content-Type: application/json" \
     -d '{
       "schoolName": "Test School",
       "schoolCode": "TEST001",
       "contactPerson": {
         "firstName": "John",
         "lastName": "Doe",
         "email": "john.doe@testschool.com",
         "phone": "+1234567890"
       },
       "address": {
         "country": "USA",
         "state": "California",
         "city": "Los Angeles",
         "street1": "123 Main St"
       },
       "schoolDetails": {
         "type": "SECONDARY",
         "capacity": 500
       }
     }'
   ```

3. **System Admin Login**:
   ```bash
   curl -X POST http://localhost:3000/api/system-admin/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "system.admin@example.com",
       "password": "admin123"
     }'
   ```

4. **Approve Signup Request**:
   ```bash
   curl -X POST http://localhost:3000/api/system-admin/school-signup-requests/{requestId}/update \
     -H "Authorization: Bearer {access_token}" \
     -H "Content-Type: application/json" \
     -d '{
       "action": "approve",
       "notes": "Approved after review"
     }'
   ```

## Dependencies

- **Prisma**: Database ORM
- **bcrypt**: Password hashing
- **class-validator**: Input validation
- **class-transformer**: Data transformation
- **@nestjs/swagger**: API documentation
- **Mail Service**: Email notifications

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `FRONTEND_URL`: Frontend URL for login links (optional)
- JWT configuration variables

## Future Enhancements

1. **Email Templates**: Move email content to templates
2. **File Uploads**: Support for school documents
3. **Multi-step Approval**: Multiple approval levels
4. **Analytics**: Track signup metrics
5. **Notifications**: Real-time notifications
6. **Audit Trail**: Detailed audit logging 