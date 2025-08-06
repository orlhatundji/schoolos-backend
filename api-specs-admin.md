# Admin Management API Endpoint Specifications

Based on the Saint James Admin Portal Admin Management UI, here are the required API endpoints:

## 1. Admin Overview Statistics

### GET /api/admin/overview
**Description**: Get overall admin statistics and summary metrics

**Response**:
```json
{
  "statistics": {
    "totalAdmins": {
      "count": 8,
      "description": "All admin accounts"
    },
    "active": {
      "count": 6,
      "description": "Currently active"
    },
    "inactive": {
      "count": 1,
      "description": "Temporarily inactive"
    },
    "suspended": {
      "count": 1,
      "description": "Access suspended"
    },
    "admins": {
      "count": 4,
      "description": "Department managers"
    },
    "hods": {
      "count": 3,
      "description": "Heads of Department"
    }
  }
}
```

## 2. Admin List with Pagination

### GET /api/admin
**Description**: Get paginated list of all admins with detailed information

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term for admin name, email, or admin ID
- `role` (optional): Filter by role ("SUPER_ADMIN", "ADMIN", "HOD")
- `department` (optional): Filter by department
- `status` (optional): Filter by status ("active", "inactive", "suspended")
- `lastLogin` (optional): Filter by last login period ("today", "yesterday", "this_week", "this_month")
- `sortBy` (optional): Sort field ("name", "role", "department", "lastLogin", "dateAdded")
- `sortOrder` (optional): "asc" | "desc" (default: "asc")

**Response**:
```json
{
  "admins": [
    {
      "id": "adm_001",
      "user": {
        "id": "usr_001",
        "firstName": "John",
        "lastName": "Smith",
        "email": "john.smith@schools.com",
        "avatar": "/avatars/john_smith.jpg",
        "phone": "+234-800-000-0001"
      },
      "adminId": "ADM001",
      "role": {
        "type": "SUPER_ADMIN",
        "label": "Super Admin",
        "badge": {
          "text": "SUPER ADMIN",
          "color": "purple",
          "backgroundColor": "#f3e5f5"
        },
        "permissions": [
          "ALL_ACCESS",
          "USER_MANAGEMENT",
          "SYSTEM_CONFIGURATION",
          "SCHOOL_MANAGEMENT"
        ]
      },
      "department": {
        "id": "dept_administration",
        "name": "Administration"
      },
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "ACTIVE",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "lastLogin": {
        "date": "2025-08-01T14:30:00Z",
        "label": "Yesterday",
        "ipAddress": "192.168.1.10",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
      },
      "dateAdded": "2024-01-15T00:00:00Z",
      "isSuper": true,
      "createdAt": "2024-01-15T00:00:00Z",
      "updatedAt": "2025-08-02T10:00:00Z"
    },
    {
      "id": "adm_002",
      "user": {
        "id": "usr_002",
        "firstName": "Sarah",
        "lastName": "Johnson",
        "email": "sarah.johnson@schools.com",
        "avatar": "/avatars/sarah_johnson.jpg",
        "phone": "+234-800-000-0002"
      },
      "adminId": "ADM002",
      "role": {
        "type": "ADMIN",
        "label": "Admin",
        "badge": {
          "text": "ADMIN",
          "color": "blue",
          "backgroundColor": "#e3f2fd"
        },
        "permissions": [
          "STUDENT_MANAGEMENT",
          "TEACHER_MANAGEMENT",
          "ACADEMIC_MANAGEMENT"
        ]
      },
      "department": {
        "id": "dept_academic_affairs",
        "name": "Academic Affairs"
      },
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "ACTIVE",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "lastLogin": {
        "date": "2025-08-01T16:45:00Z",
        "label": "Yesterday",
        "ipAddress": "192.168.1.15",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      "dateAdded": "2024-02-20T00:00:00Z",
      "isSuper": false,
      "createdAt": "2024-02-20T00:00:00Z",
      "updatedAt": "2025-08-02T09:30:00Z"
    },
    {
      "id": "adm_003",
      "user": {
        "id": "usr_003",
        "firstName": "Michael",
        "lastName": "Brown",
        "email": "michael.brown@schools.com",
        "avatar": "/avatars/michael_brown.jpg",
        "phone": "+234-800-000-0003"
      },
      "adminId": "ADM003",
      "role": {
        "type": "HOD",
        "label": "Head of Department",
        "badge": {
          "text": "HOD",
          "color": "orange",
          "backgroundColor": "#fff3e0"
        },
        "permissions": [
          "DEPARTMENT_MANAGEMENT",
          "TEACHER_SUPERVISION",
          "CURRICULUM_OVERSIGHT"
        ]
      },
      "department": {
        "id": "dept_it_support",
        "name": "IT Support"
      },
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "ACTIVE",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "lastLogin": {
        "date": "2025-07-31T09:15:00Z",
        "label": "7/31/2025",
        "ipAddress": "192.168.1.20",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
      },
      "dateAdded": "2024-03-10T00:00:00Z",
      "isSuper": false,
      "hodAssignment": {
        "departmentId": "dept_it_support",
        "startDate": "2024-03-10T00:00:00Z",
        "endDate": null
      },
      "createdAt": "2024-03-10T00:00:00Z",
      "updatedAt": "2025-08-02T09:45:00Z"
    },
    {
      "id": "adm_004",
      "user": {
        "id": "usr_004",
        "firstName": "Emily",
        "lastName": "Davis",
        "email": "emily.davis@schools.com",
        "avatar": "/avatars/emily_davis.jpg",
        "phone": "+234-800-000-0004"
      },
      "adminId": "ADM004",
      "role": {
        "type": "ADMIN",
        "label": "Admin",
        "badge": {
          "text": "ADMIN",
          "color": "blue",
          "backgroundColor": "#e3f2fd"
        },
        "permissions": [
          "STUDENT_AFFAIRS",
          "ENROLLMENT_MANAGEMENT",
          "COMMUNICATION"
        ]
      },
      "department": {
        "id": "dept_student_affairs",
        "name": "Student Affairs"
      },
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "ACTIVE",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "lastLogin": {
        "date": "2025-08-01T11:20:00Z",
        "label": "Yesterday",
        "ipAddress": "192.168.1.25",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      "dateAdded": "2024-04-05T00:00:00Z",
      "isSuper": false,
      "createdAt": "2024-04-05T00:00:00Z",
      "updatedAt": "2025-08-02T09:15:00Z"
    },
    {
      "id": "adm_005",
      "user": {
        "id": "usr_005",
        "firstName": "David",
        "lastName": "Wilson",
        "email": "david.wilson@schools.com",
        "avatar": "/avatars/david_wilson.jpg",
        "phone": "+234-800-000-0005"
      },
      "adminId": "ADM005",
      "role": {
        "type": "HOD",
        "label": "Head of Department",
        "badge": {
          "text": "HOD",
          "color": "orange",
          "backgroundColor": "#fff3e0"
        },
        "permissions": [
          "DEPARTMENT_MANAGEMENT",
          "FINANCIAL_OVERSIGHT",
          "BUDGET_PLANNING"
        ]
      },
      "department": {
        "id": "dept_finance",
        "name": "Finance"
      },
      "status": {
        "current": "inactive",
        "label": "Inactive",
        "badge": {
          "text": "INACTIVE",
          "color": "yellow",
          "backgroundColor": "#fff8e1"
        }
      },
      "lastLogin": {
        "date": "2025-07-28T16:00:00Z",
        "label": "7/28/2025",
        "ipAddress": "192.168.1.30",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
      },
      "dateAdded": "2024-05-12T00:00:00Z",
      "isSuper": false,
      "hodAssignment": {
        "departmentId": "dept_finance",
        "startDate": "2024-05-12T00:00:00Z",
        "endDate": null
      },
      "createdAt": "2024-05-12T00:00:00Z",
      "updatedAt": "2025-08-02T08:30:00Z"
    },
    {
      "id": "adm_006",
      "user": {
        "id": "usr_006",
        "firstName": "Lisa",
        "lastName": "Garcia",
        "email": "lisa.garcia@schools.com",
        "avatar": "/avatars/lisa_garcia.jpg",
        "phone": "+234-800-000-0006"
      },
      "adminId": "ADM006",
      "role": {
        "type": "ADMIN",
        "label": "Admin",
        "badge": {
          "text": "ADMIN",
          "color": "blue",
          "backgroundColor": "#e3f2fd"
        },
        "permissions": [
          "HR_MANAGEMENT",
          "STAFF_RECORDS",
          "RECRUITMENT"
        ]
      },
      "department": {
        "id": "dept_human_resources",
        "name": "Human Resources"
      },
      "status": {
        "current": "suspended",
        "label": "Suspended",
        "badge": {
          "text": "SUSPENDED",
          "color": "red",
          "backgroundColor": "#ffebee"
        }
      },
      "lastLogin": {
        "date": "2025-07-20T14:30:00Z",
        "label": "7/20/2025",
        "ipAddress": "192.168.1.35",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      "dateAdded": "2024-06-18T00:00:00Z",
      "isSuper": false,
      "suspensionDetails": {
        "reason": "Policy violation investigation",
        "suspendedBy": "adm_001",
        "suspendedDate": "2025-07-21T00:00:00Z",
        "expectedReviewDate": "2025-08-15T00:00:00Z"
      },
      "createdAt": "2024-06-18T00:00:00Z",
      "updatedAt": "2025-08-02T08:00:00Z"
    },
    {
      "id": "adm_007",
      "user": {
        "id": "usr_007",
        "firstName": "James",
        "lastName": "Miller",
        "email": "james.miller@schools.com",
        "avatar": "/avatars/james_miller.jpg",
        "phone": "+234-800-000-0007"
      },
      "adminId": "ADM007",
      "role": {
        "type": "HOD",
        "label": "Head of Department",
        "badge": {
          "text": "HOD",
          "color": "orange",
          "backgroundColor": "#fff3e0"
        },
        "permissions": [
          "FACILITIES_MANAGEMENT",
          "MAINTENANCE_OVERSIGHT",
          "SECURITY_COORDINATION"
        ]
      },
      "department": {
        "id": "dept_facilities",
        "name": "Facilities"
      },
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "ACTIVE",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "lastLogin": {
        "date": "2025-07-30T13:45:00Z",
        "label": "7/30/2025",
        "ipAddress": "192.168.1.40",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
      },
      "dateAdded": "2024-07-22T00:00:00Z",
      "isSuper": false,
      "hodAssignment": {
        "departmentId": "dept_facilities",
        "startDate": "2024-07-22T00:00:00Z",
        "endDate": null
      },
      "createdAt": "2024-07-22T00:00:00Z",
      "updatedAt": "2025-08-02T07:30:00Z"
    },
    {
      "id": "adm_008",
      "user": {
        "id": "usr_008",
        "firstName": "Amanda",
        "lastName": "Rodriguez",
        "email": "amanda.rodriguez@schools.com",
        "avatar": "/avatars/amanda_rodriguez.jpg",
        "phone": "+234-800-000-0008"
      },
      "adminId": "ADM008",
      "role": {
        "type": "ADMIN",
        "label": "Admin",
        "badge": {
          "text": "ADMIN",
          "color": "blue",
          "backgroundColor": "#e3f2fd"
        },
        "permissions": [
          "COMMUNICATION_MANAGEMENT",
          "PUBLIC_RELATIONS",
          "EVENT_COORDINATION"
        ]
      },
      "department": {
        "id": "dept_communications",
        "name": "Communications"
      },
      "status": {
        "current": "active",
        "label": "Active",
        "badge": {
          "text": "ACTIVE",
          "color": "green",
          "backgroundColor": "#e8f5e8"
        }
      },
      "lastLogin": {
        "date": "2025-08-01T15:20:00Z",
        "label": "Yesterday",
        "ipAddress": "192.168.1.45",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      "dateAdded": "2024-08-01T00:00:00Z",
      "isSuper": false,
      "createdAt": "2024-08-01T00:00:00Z",
      "updatedAt": "2025-08-02T07:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 8,
    "itemsPerPage": 10,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "summary": {
    "totalAdmins": 8,
    "displayedRange": "8 of 8 admins",
    "roleBreakdown": {
      "SUPER_ADMIN": 1,
      "ADMIN": 4,
      "HOD": 3
    },
    "statusBreakdown": {
      "active": 6,
      "inactive": 1,
      "suspended": 1
    },
    "departmentBreakdown": {
      "Administration": 1,
      "Academic Affairs": 1,
      "IT Support": 1,
      "Student Affairs": 1,
      "Finance": 1,
      "Human Resources": 1,
      "Facilities": 1,
      "Communications": 1
    },
    "recentLogins": {
      "today": 0,
      "yesterday": 4,
      "thisWeek": 8
    }
  }
}
```

## 3. Single Admin Details

### GET /api/admin/{adminId}
**Description**: Get detailed information about a specific admin

**Path Parameters**:
- `adminId`: Unique identifier for the admin

**Response**:
```json
{
  "admin": {
    "id": "adm_001",
    "user": {
      "id": "usr_001",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john.smith@schools.com",
      "phone": "+234-800-000-0001",
      "avatar": "/avatars/john_smith.jpg",
      "dateOfBirth": "1985-05-15",
      "address": {
        "street1": "123 Admin Street",
        "city": "Lagos",
        "state": "Lagos State",
        "country": "Nigeria"
      }
    },
    "adminId": "ADM001",
    "role": {
      "type": "SUPER_ADMIN",
      "label": "Super Admin",
      "assignedDate": "2024-01-15T00:00:00Z",
      "assignedBy": "system"
    },
    "department": {
      "id": "dept_administration",
      "name": "Administration",
      "description": "Overall school administration and management"
    },
    "permissions": {
      "system": [
        "USER_MANAGEMENT",
        "ROLE_ASSIGNMENT",
        "SYSTEM_CONFIGURATION",
        "BACKUP_RESTORE",
        "AUDIT_LOGS"
      ],
      "academic": [
        "STUDENT_MANAGEMENT",
        "TEACHER_MANAGEMENT",
        "CURRICULUM_OVERSIGHT",
        "ASSESSMENT_MANAGEMENT"
      ],
      "administrative": [
        "DEPARTMENT_MANAGEMENT",
        "FINANCIAL_OVERSIGHT",
        "FACILITY_MANAGEMENT",
        "HR_MANAGEMENT"
      ]
    },
    "loginHistory": [
      {
        "date": "2025-08-01T14:30:00Z",
        "ipAddress": "192.168.1.10",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "location": "Lagos, Nigeria",
        "success": true
      },
      {
        "date": "2025-07-31T09:15:00Z",
        "ipAddress": "192.168.1.10",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "location": "Lagos, Nigeria",
        "success": true
      }
    ],
    "activityLog": [
      {
        "action": "USER_CREATED",
        "target": "student_john_doe",
        "timestamp": "2025-08-01T10:30:00Z",
        "details": "Created new student account"
      },
      {
        "action": "ROLE_ASSIGNED",
        "target": "teacher_jane_smith",
        "timestamp": "2025-07-31T15:45:00Z",
        "details": "Assigned HOD role to Science department"
      }
    ],
    "status": {
      "current": "active",
      "lastChanged": "2024-01-15T00:00:00Z",
      "changedBy": "system"
    },
    "isSuper": true,
    "mustUpdatePassword": false,
    "passwordLastChanged": "2025-06-15T00:00:00Z",
    "twoFactorEnabled": true,
    "createdAt": "2024-01-15T00:00:00Z",
    "updatedAt": "2025-08-02T10:00:00Z"
  }
}
```

## 4. Create New Admin

### POST /api/admin
**Description**: Create a new admin account

**Request Body**:
```json
{
  "personalInformation": {
    "firstName": "Robert",
    "lastName": "Anderson",
    "email": "robert.anderson@schools.com",
    "phone": "+234-800-000-0009",
    "dateOfBirth": "1980-03-20",
    "address": {
      "street1": "456 Admin Avenue",
      "city": "Lagos",
      "state": "Lagos State",
      "country": "Nigeria"
    }
  },
  "adminDetails": {
    "role": "ADMIN",
    "departmentId": "dept_academic_affairs",
    "permissions": [
      "STUDENT_MANAGEMENT",
      "TEACHER_MANAGEMENT",
      "ACADEMIC_REPORTS"
    ]
  },
  "profilePicture": {
    "avatarUrl": "/uploads/avatars/admin_12345.jpg"
  },
  "temporaryPassword": "TempPass123!",
  "mustUpdatePassword": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Admin account created successfully",
  "admin": {
    "id": "adm_009",
    "adminId": "ADM009",
    "user": {
      "id": "usr_009",
      "firstName": "Robert",
      "lastName": "Anderson",
      "email": "robert.anderson@schools.com"
    },
    "role": "ADMIN",
    "department": {
      "id": "dept_academic_affairs",
      "name": "Academic Affairs"
    },
    "status": "active",
    "mustUpdatePassword": true,
    "createdAt": "2025-08-02T15:30:00Z"
  }
}
```

## 5. Update Admin

### PUT /api/admin/{adminId}
**Description**: Update admin information

**Path Parameters**:
- `adminId`: Unique identifier for the admin

**Request Body**:
```json
{
  "personalInformation": {
    "phone": "+234-800-000-0025",
    "address": {
      "street1": "789 New Admin Street",
      "city": "Abuja"
    }
  },
  "adminDetails": {
    "departmentId": "dept_student_affairs",
    "permissions": [
      "STUDENT_MANAGEMENT",
      "ENROLLMENT_MANAGEMENT",
      "COMMUNICATION"
    ]
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Admin updated successfully",
  "admin": {
    "id": "adm_002",
    "updatedAt": "2025-08-02T15:45:00Z"
  }
}
```

## 6. Update Admin Status

### PATCH /api/admin/{adminId}/status
**Description**: Update admin status (active, inactive, suspended)

**Path Parameters**:
- `adminId`: Unique identifier for the admin

**Request Body**:
```json
{
  "status": "suspended",
  "reason": "Security investigation",
  "suspendedBy": "adm_001",
  "notes": "Account suspended pending investigation of security breach",
  "reviewDate": "2025-08-15"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Admin status updated successfully",
  "statusChange": {
    "adminId": "adm_006",
    "previousStatus": "active",
    "newStatus": "suspended",
    "reason": "Security investigation",
    "suspendedBy": "adm_001",
    "effectiveDate": "2025-08-02T15:30:00Z"
  }
}
```

## 7. Admin Role Management

### POST /api/admin/{adminId}/role
**Description**: Assign or update admin role

**Path Parameters**:
- `adminId`: Unique identifier for the admin

**Request Body**:
```json
{
  "role": "HOD",
  "departmentId": "dept_science",
  "permissions": [
    "DEPARTMENT_MANAGEMENT",
    "TEACHER_SUPERVISION",
    "CURRICULUM_OVERSIGHT"
  ],
  "effectiveDate": "2025-08-03",
  "assignedBy": "adm_001"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Admin role updated successfully",
  "roleAssignment": {
    "adminId": "adm_003",
    "previousRole": "ADMIN",
    "newRole": "HOD",
    "department": "Science",
    "assignedDate": "2025-08-03T00:00:00Z",
    "assignedBy": "John Smith"
  }
}
```

## 8. Admin Activity Logs

### GET /api/admin/{adminId}/activity
**Description**: Get admin activity logs and audit trail

**Path Parameters**:
- `adminId`: Unique identifier for the admin

**Query Parameters**:
- `startDate` (optional): Start date for logs (YYYY-MM-DD)
- `endDate` (optional): End date for logs (YYYY-MM-DD)
- `action` (optional): Filter by action type
- `limit` (optional): Number of records to return (default: 50)

**Response**:
```json
{
  "activity": {
    "adminId": "adm_001",
    "totalActions": 150,
    "dateRange": {
      "start": "2025-07-01",
      "end": "2025-08-02"
    },
    "logs": [
      {
        "id": "log_001",
        "action": "USER_CREATED",
        "target": {
          "type": "STUDENT",
          "id": "std_025",
          "name": "John Doe"
        },
        "timestamp": "2025-08-01T10:30:00Z",
        "ipAddress": "192.168.1.10",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "details": {
          "description": "Created new student account",
          "changes": {
            "firstName": "John",
            "lastName": "Doe",
            "class": "JSS 1 Alpha"
          }
        }
      },
      {
        "id": "log_002",
        "action": "ROLE_ASSIGNED",
        "target": {
          "type": "TEACHER",
          "id": "tch_015",
          "name": "Jane Smith"
        },
        "timestamp": "2025-07-31T15:45:00Z",
        "ipAddress": "192.168.1.10",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "details": {
          "description": "Assigned HOD role to Science department",
          "changes": {
            "previousRole": "TEACHER",
            "newRole": "HOD",
            "department": "Science"
          }
        }
      }
    ],
    "actionSummary": {
      "USER_CREATED": 25,
      "USER_UPDATED": 45,
      "ROLE_ASSIGNED": 12,
      "STATUS_CHANGED": 8,
      "LOGIN": 60
    }
  }
}
```

## 9. Admin Login History

### GET /api/admin/{adminId}/login-history
**Description**: Get admin login history and security information

**Path Parameters**:
- `adminId`: Unique identifier for the admin

**Query Parameters**:
- `days` (optional): Number of days to look back (default: 30)
- `includeFailedAttempts` (optional): Include failed login attempts (default: false)

**Response**:
```json
{
  "loginHistory": {
    "adminId": "adm_001",
    "totalLogins": 45,
    "successfulLogins": 44,
    "failedAttempts": 1,
    "uniqueIpAddresses": 2,
    "sessions": [
      {
        "id": "session_001",
        "loginTime": "2025-08-01T14:30:00Z",
        "logoutTime": "2025-08-01T18:45:00Z",
        "duration": "4h 15m",
        "ipAddress": "192.168.1.10",
        "location": "Lagos, Nigeria",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "device": "Desktop - macOS",
        "success": true
      },
      {
        "id": "session_002",
        "loginTime": "2025-07-31T09:15:00Z",
        "logoutTime": "2025-07-31T17:30:00Z",
        "duration": "8h 15m",
        "ipAddress": "192.168.1.10",
        "location": "Lagos, Nigeria",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "device": "Desktop - macOS",
        "success": true
      }
    ],
    "securityAlerts": [
      {
        "type": "SUSPICIOUS_LOGIN",
        "message": "Login from new IP address",
        "date": "2025-07-25T10:00:00Z",
        "resolved": true
      }
    ]
  }
}
```

## 10. Admin Permissions Management

### GET /api/admin/permissions
**Description**: Get available permissions and role definitions

**Response**:
```json
{
  "roles": {
    "SUPER_ADMIN": {
      "label": "Super Admin",
      "description": "Full system access and control",
      "permissions": [
        "ALL_ACCESS",
        "USER_MANAGEMENT",
        "ROLE_ASSIGNMENT",
        "SYSTEM_CONFIGURATION",
        "AUDIT_LOGS",
        "BACKUP_RESTORE"
      ]
    },
    "ADMIN": {
      "label": "Admin",
      "description": "Administrative access to assigned departments",
      "permissions": [
        "STUDENT_MANAGEMENT",
        "TEACHER_MANAGEMENT",
        "ACADEMIC_MANAGEMENT",
        "COMMUNICATION",
        "REPORTS"
      ]
    },
    "HOD": {
      "label": "Head of Department",
      "description": "Department-specific administrative access",
      "permissions": [
        "DEPARTMENT_MANAGEMENT",
        "TEACHER_SUPERVISION",
        "CURRICULUM_OVERSIGHT",
        "DEPARTMENT_REPORTS"
      ]
    }
  },
  "permissions": {
    "USER_MANAGEMENT": {
      "label": "User Management",
      "description": "Create, update, and manage user accounts"
    },
    "STUDENT_MANAGEMENT": {
      "label": "Student Management",
      "description": "Manage student records and enrollment"
    },
    "TEACHER_MANAGEMENT": {
      "label": "Teacher Management",
      "description": "Manage teacher records and assignments"
    },
    "DEPARTMENT_MANAGEMENT": {
      "label": "Department Management",
      "description": "Manage department operations and staff"
    },
    "ACADEMIC_MANAGEMENT": {
      "label": "Academic Management",
      "description": "Manage curriculum, assessments, and academic records"
    },
    "COMMUNICATION": {
      "label": "Communication",
      "description": "Send notifications and manage communications"
    },
    "REPORTS": {
      "label": "Reports",
      "description": "Generate and view system reports"
    },
    "SYSTEM_CONFIGURATION": {
      "label": "System Configuration",
      "description": "Configure system settings and parameters"
    },
    "AUDIT_LOGS": {
      "label": "Audit Logs",
      "description": "View system audit logs and activity"
    }
  }
}
```

## 11. Search and Filter Options

### GET /api/admin/filters
**Description**: Get available filter options for admin management

**Response**:
```json
{
  "roles": [
    { "type": "SUPER_ADMIN", "label": "Super Admin", "count": 1 },
    { "type": "ADMIN", "label": "Admin", "count": 4 },
    { "type": "HOD", "label": "Head of Department", "count": 3 }
  ],
  "departments": [
    { "id": "dept_administration", "name": "Administration", "adminCount": 1 },
    { "id": "dept_academic_affairs", "name": "Academic Affairs", "adminCount": 1 },
    { "id": "dept_it_support", "name": "IT Support", "adminCount": 1 },
    { "id": "dept_student_affairs", "name": "Student Affairs", "adminCount": 1 },
    { "id": "dept_finance", "name": "Finance", "adminCount": 1 },
    { "id": "dept_human_resources", "name": "Human Resources", "adminCount": 1 },
    { "id": "dept_facilities", "name": "Facilities", "adminCount": 1 },
    { "id": "dept_communications", "name": "Communications", "adminCount": 1 }
  ],
  "statuses": [
    { "status": "active", "label": "Active", "count": 6 },
    { "status": "inactive", "label": "Inactive", "count": 1 },
    { "status": "suspended", "label": "Suspended", "count": 1 }
  ],
  "lastLoginPeriods": [
    { "period": "today", "label": "Today", "count": 0 },
    { "period": "yesterday", "label": "Yesterday", "count": 4 },
    { "period": "this_week", "label": "This Week", "count": 8 },
    { "period": "this_month", "label": "This Month", "count": 8 }
  ]
}
```

## Error Responses

All endpoints should return consistent error responses:

```json
{
  "error": {
    "code": "ADMIN_NOT_FOUND",
    "message": "Admin with ID 'adm_999' not found.",
    "details": {
      "adminId": "adm_999"
    }
  }
}
```

## Security & Authentication

- All endpoints require authentication via JWT token
- Super Admin role required for admin creation/deletion
- Admins can only update their own profile (except Super Admins)
- Role changes require Super Admin approval
- Two-factor authentication support for admin accounts
- Rate limiting: 50 requests per minute per admin
- Input validation for all POST/PUT requests
- Email uniqueness validation
- Admin ID uniqueness validation
- Password complexity requirements
- Audit logging for all admin actions

## Caching Strategy

- Admin overview: Cache for 5 minutes
- Admin list: Cache for 3 minutes
- Single admin details: Cache for 10 minutes
- Admin activity logs: Cache for 15 minutes
- Admin permissions: Cache for 1 hour
- Filter options: Cache for 30 minutes

## Additional Features

### GET /api/admin/export
**Description**: Export admin data to Excel/CSV

**Query Parameters**:
- `format`: "excel" | "csv"
- `filters`: Same as admin list filters
- `includeActivity`: Include activity logs in export

### POST /api/admin/bulk-operations
**Description**: Perform bulk operations on admin accounts

**Request Body**:
```json
{
  "operation": "status_update",
  "adminIds": ["adm_002", "adm_003"],
  "data": {
    "status": "active"
  }
}
```

### GET /api/admin/security-report
**Description**: Generate security report for admin accounts

**Response**:
```json
{
  "securityReport": {
    "totalAdmins": 8,
    "activeAdmins": 6,
    "suspendedAdmins": 1,
    "inactiveAdmins": 1,
    "adminsWithTwoFactor": 5,
    "recentLoginFailures": 2,
    "passwordExpiringSoon": 1,
    "suspiciousActivity": 0
  }
}
```

## Integration with Prisma Schema

These endpoints integrate with the following Prisma models:

- **Admin**: Core admin information
- **User**: Authentication and profile data
- **Department**: Departmental assignments
- **Hod**: Head of Department relationships
- **UserToken**: Authentication tokens
- **School**: Multi-school support
- **Address**: Admin address information

The API ensures proper relationships and data integrity while providing comprehensive admin management capabilities with robust security and audit features.
