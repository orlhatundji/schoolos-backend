# Dashboard API Endpoint Specifications

Based on the Saint James Admin Portal dashboard UI, here are the required API endpoints:

## 1. Dashboard Summary Statistics

### GET /api/dashboard/summary
**Description**: Get overall dashboard statistics for the current academic session

**Response**:
```json
{
  "totalStudents": {
    "count": 1247,
    "percentageChange": 8.2,
    "changeFromLastMonth": 89
  },
  "teachingStaff": {
    "count": 67,
    "percentageChange": 5.1,
    "newHires": 3
  },
  "feeCollection": {
    "amount": 48200000,
    "currency": "NGN",
    "percentageChange": 12.5,
    "period": "This academic session"
  }
}
```

## 2. Financial Overview

### GET /api/dashboard/financial-overview
**Description**: Get financial statistics for pending payments and overdue fees

**Response**:
```json
{
  "pendingPayments": {
    "amount": 2800000,
    "currency": "NGN",
    "percentageChange": -15.3,
    "studentsCount": 142
  },
  "overdueFees": {
    "amount": 890000,
    "currency": "NGN",
    "percentageChange": 8.7,
    "requiresAttention": true
  },
  "activeSubjects": {
    "count": 28,
    "newSubjects": 2
  }
}
```

## 3. Student Attendance Data

### GET /api/dashboard/attendance-summary
**Description**: Get student attendance statistics with breakdown

**Response**:
```json
{
  "overallAttendanceRate": 11.02,
  "breakdown": {
    "present": {
      "percentage": 88.98,
      "count": 1109
    },
    "absent": {
      "percentage": 11.02,
      "count": 138
    }
  },
  "period": "current_term"
}
```

### GET /api/dashboard/attendance-details
**Description**: Get detailed attendance data for charts and analytics

**Response**:
```json
{
  "dailyAttendance": [
    {
      "date": "2025-08-01",
      "present": 1105,
      "absent": 142,
      "late": 15,
      "excused": 8
    }
  ],
  "weeklyTrends": [
    {
      "week": "2025-W31",
      "averageAttendance": 89.2
    }
  ]
}
```

## 4. Fee Payment Status

### GET /api/dashboard/fee-payment-status
**Description**: Get fee payment status breakdown for current academic session

**Response**:
```json
{
  "totalStudents": 1247,
  "paymentBreakdown": {
    "fullyPaid": {
      "count": 1105,
      "percentage": 88.6,
      "amount": 48200000
    },
    "partiallyPaid": {
      "count": 89,
      "percentage": 7.1,
      "amount": 15600000
    },
    "unpaid": {
      "count": 53,
      "percentage": 4.3,
      "amount": 0
    }
  }
}
```

## 5. Recent Activities

### GET /api/dashboard/recent-activities
**Description**: Get latest administrative events and activities

**Query Parameters**:
- `limit` (optional): Number of activities to return (default: 10)
- `offset` (optional): Pagination offset

**Response**:
```json
{
  "activities": [
    {
      "id": "act_001",
      "type": "FEE_PAYMENT_RECEIVED",
      "title": "Fee Payment Received",
      "description": "Adebayo Samuel - Second Term Fees",
      "amount": 75000,
      "currency": "NGN",
      "timestamp": "2025-08-02T10:30:00Z",
      "timeAgo": "2 min ago",
      "icon": "payment",
      "status": "success"
    },
    {
      "id": "act_002",
      "type": "NEW_STUDENT_ENROLLED",
      "title": "New Student Enrolled",
      "description": "Fatima Ahmed - Grade 8B",
      "timestamp": "2025-08-02T10:15:00Z",
      "timeAgo": "15 min ago",
      "icon": "user_add",
      "status": "info"
    },
    {
      "id": "act_003",
      "type": "OVERDUE_PAYMENT_ALERT",
      "title": "Overdue Payment Alert",
      "description": "John Okafor - 14 days overdue",
      "amount": 45000,
      "currency": "NGN",
      "timestamp": "2025-08-02T09:30:00Z",
      "timeAgo": "1 hour ago",
      "icon": "warning",
      "status": "warning"
    }
  ],
  "pagination": {
    "total": 156,
    "page": 1,
    "limit": 10,
    "hasMore": true
  }
}
```

## 6. Quick Actions Data

### GET /api/dashboard/quick-actions
**Description**: Get frequently used administrative tasks and their status

**Response**:
```json
{
  "actions": [
    {
      "id": "academic_trends",
      "title": "Academic Trends",
      "description": "View detailed performance analysis",
      "icon": "chart_trending_up",
      "url": "/academic-trends",
      "enabled": true
    }
  ]
}
```

## 7. Current User Context

### GET /api/dashboard/user-context
**Description**: Get current logged-in admin user context

**Response**:
```json
{
  "user": {
    "name": "Adewole Julius",
    "role": "Teacher",
    "avatar": "/avatars/adewole_julius.jpg",
    "permissions": ["VIEW_DASHBOARD", "MANAGE_STUDENTS", "VIEW_ATTENDANCE"],
    "currentSchool": {
      "id": "school_001",
      "name": "Saint James",
      "code": "SJ"
    }
  }
}
```

## 8. Navigation Menu Data

### GET /api/dashboard/navigation
**Description**: Get navigation menu items based on user permissions

**Response**:
```json
{
  "menuItems": [
    {
      "id": "dashboard",
      "label": "Dashboard",
      "icon": "dashboard",
      "url": "/dashboard",
      "active": true
    },
    {
      "id": "classrooms",
      "label": "Classrooms",
      "icon": "classroom",
      "url": "/classrooms",
      "active": false
    },
    {
      "id": "teachers",
      "label": "Teachers",
      "icon": "users",
      "url": "/teachers",
      "active": false
    },
    {
      "id": "students",
      "label": "Students",
      "icon": "student",
      "url": "/students",
      "active": false
    },
    {
      "id": "subjects",
      "label": "Subjects",
      "icon": "book",
      "url": "/subjects",
      "active": false
    }
  ]
}
```

## Additional Endpoints for Real-time Updates

### GET /api/dashboard/live-stats
**Description**: Get real-time statistics for dashboard auto-refresh

**Response**: Same structure as summary endpoint but optimized for frequent polling

### WebSocket: /ws/dashboard
**Description**: WebSocket connection for real-time dashboard updates
- New student enrollments
- Payment notifications
- Attendance updates
- System alerts

## Error Responses

All endpoints should return consistent error responses:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access denied. Admin privileges required.",
    "details": {}
  }
}
```

## Security & Authentication

- All endpoints require authentication via JWT token
- Admin or Teacher role required for access
- Rate limiting: 100 requests per minute per user
- CORS enabled for dashboard domain only

## 9. Monthly Attendance Performance

### GET /api/dashboard/attendance-performance
**Description**: Get monthly attendance performance data with trends and targets

**Query Parameters**:
- `year` (optional): Specific year (default: current year)
- `months` (optional): Number of months to include (default: 12)

**Response**:
```json
{
  "performanceMetrics": {
    "current": {
      "percentage": 89,
      "status": "Current"
    },
    "average": {
      "percentage": 89.8,
      "status": "Average"
    },
    "target": {
      "percentage": 90,
      "status": "Target"
    }
  },
  "monthlyData": [
    {
      "month": "Sep",
      "year": 2024,
      "attendanceRate": 92,
      "target": 90,
      "belowTarget": false
    },
    {
      "month": "Oct",
      "year": 2024,
      "attendanceRate": 89,
      "target": 90,
      "belowTarget": true
    },
    {
      "month": "Nov",
      "year": 2024,
      "attendanceRate": 91,
      "target": 90,
      "belowTarget": false
    },
    {
      "month": "Dec",
      "year": 2024,
      "attendanceRate": 85,
      "target": 90,
      "belowTarget": true
    },
    {
      "month": "Jan",
      "year": 2025,
      "attendanceRate": 94,
      "target": 90,
      "belowTarget": false
    },
    {
      "month": "Feb",
      "year": 2025,
      "attendanceRate": 88,
      "target": 90,
      "belowTarget": true
    },
    {
      "month": "Mar",
      "year": 2025,
      "attendanceRate": 92,
      "target": 90,
      "belowTarget": false
    },
    {
      "month": "Apr",
      "year": 2025,
      "attendanceRate": 90,
      "target": 90,
      "belowTarget": false
    },
    {
      "month": "May",
      "year": 2025,
      "attendanceRate": 87,
      "target": 90,
      "belowTarget": true
    },
    {
      "month": "Jun",
      "year": 2025,
      "attendanceRate": 91,
      "target": 90,
      "belowTarget": false
    },
    {
      "month": "Jul",
      "year": 2025,
      "attendanceRate": 89,
      "target": 90,
      "belowTarget": true
    }
  ],
  "insights": {
    "targetAchievement": "90% target",
    "monthsBelowTarget": 5,
    "monthsAboveTarget": 6,
    "trend": "stable",
    "recommendations": [
      "Focus on December and February attendance improvement",
      "Maintain consistent performance in high-performing months"
    ]
  }
}
```

## 10. Enrollment Trends

### GET /api/dashboard/enrollment-trends
**Description**: Get student enrollment trends vs capacity with utilization metrics

**Query Parameters**:
- `period` (optional): "monthly" | "yearly" (default: "monthly")
- `months` (optional): Number of months to include (default: 12)

**Response**:
```json
{
  "currentStats": {
    "enrolled": 1247,
    "capacity": 1300,
    "available": 53,
    "utilization": 95.9
  },
  "monthlyTrends": [
    {
      "month": "Sep",
      "year": 2024,
      "enrolled": 1165,
      "capacity": 1300,
      "utilization": 89.6
    },
    {
      "month": "Oct",
      "year": 2024,
      "enrolled": 1178,
      "capacity": 1300,
      "utilization": 90.6
    },
    {
      "month": "Nov",
      "year": 2024,
      "enrolled": 1185,
      "capacity": 1300,
      "utilization": 91.2
    },
    {
      "month": "Dec",
      "year": 2024,
      "enrolled": 1190,
      "capacity": 1300,
      "utilization": 91.5
    },
    {
      "month": "Jan",
      "year": 2025,
      "enrolled": 1205,
      "capacity": 1300,
      "utilization": 92.7
    },
    {
      "month": "Feb",
      "year": 2025,
      "enrolled": 1218,
      "capacity": 1300,
      "utilization": 93.7
    },
    {
      "month": "Mar",
      "year": 2025,
      "enrolled": 1225,
      "capacity": 1300,
      "utilization": 94.2
    },
    {
      "month": "Apr",
      "year": 2025,
      "enrolled": 1235,
      "capacity": 1300,
      "utilization": 95.0
    },
    {
      "month": "May",
      "year": 2025,
      "enrolled": 1240,
      "capacity": 1300,
      "utilization": 95.4
    },
    {
      "month": "Jun",
      "year": 2025,
      "enrolled": 1245,
      "capacity": 1300,
      "utilization": 95.8
    },
    {
      "month": "Jul",
      "year": 2025,
      "enrolled": 1247,
      "capacity": 1300,
      "utilization": 95.9
    }
  ],
  "projections": {
    "nextMonth": {
      "estimatedEnrollment": 1250,
      "utilization": 96.2
    },
    "endOfYear": {
      "estimatedEnrollment": 1275,
      "utilization": 98.1
    }
  },
  "insights": {
    "growthRate": "steady increase",
    "capacityWarning": false,
    "recommendedActions": [
      "Monitor capacity closely - approaching 96% utilization",
      "Consider expansion planning for next academic year"
    ]
  }
}
```

## 11. Upcoming Events

### GET /api/dashboard/upcoming-events
**Description**: Get upcoming school events and important dates

**Query Parameters**:
- `limit` (optional): Number of events to return (default: 10)
- `days_ahead` (optional): Number of days to look ahead (default: 30)

**Response**:
```json
{
  "events": [
    {
      "id": "evt_001",
      "title": "Second Term Fee Due",
      "description": "Payment deadline approaching",
      "date": "2025-08-10",
      "time": null,
      "type": "PAYMENT_DEADLINE",
      "priority": "high",
      "icon": "calendar",
      "daysUntil": 8,
      "formattedDate": "10th Aug 2025"
    },
    {
      "id": "evt_002",
      "title": "Parent-Teacher Conference",
      "description": "Academic progress meeting",
      "date": "2025-08-22",
      "time": "09:00",
      "type": "ACADEMIC_EVENT",
      "priority": "medium",
      "icon": "users",
      "daysUntil": 20,
      "formattedDate": "22nd Aug 2025"
    },
    {
      "id": "evt_003",
      "title": "Fee Reminder Notice",
      "description": "Outstanding payments follow-up",
      "date": "2025-08-20",
      "time": null,
      "type": "ADMINISTRATIVE",
      "priority": "medium",
      "icon": "bell",
      "daysUntil": 18,
      "formattedDate": "20th Aug 2025"
    },
    {
      "id": "evt_004",
      "title": "Inter-House Sports",
      "description": "Annual sports competition",
      "date": "2025-09-05",
      "time": "08:00",
      "type": "SPORTS_EVENT",
      "priority": "low",
      "icon": "trophy",
      "daysUntil": 34,
      "formattedDate": "5th Sep 2025"
    },
    {
      "id": "evt_005",
      "title": "Third Term Registration",
      "description": "New term fee collection begins",
      "date": "2025-09-10",
      "time": null,
      "type": "REGISTRATION",
      "priority": "high",
      "icon": "clipboard",
      "daysUntil": 39,
      "formattedDate": "10th Sep 2025"
    }
  ],
  "summary": {
    "totalEvents": 15,
    "highPriority": 3,
    "thisWeek": 1,
    "thisMonth": 8
  }
}
```

## 12. Quick Actions (Extended)

### GET /api/dashboard/quick-actions-extended
**Description**: Get extended quick actions including report generation and student management

**Response**:
```json
{
  "actions": [
    {
      "id": "generate_fee_report",
      "title": "Generate Fee Report",
      "description": "Download payment reports",
      "icon": "download",
      "category": "REPORTS",
      "enabled": true,
      "url": "/reports/fees"
    },
    {
      "id": "add_new_student",
      "title": "Add New Student",
      "description": "Register new student",
      "icon": "user_plus",
      "category": "STUDENT_MANAGEMENT",
      "enabled": true,
      "url": "/students/new"
    },
    {
      "id": "academic_trends",
      "title": "Academic Trends",
      "description": "View detailed performance analysis",
      "icon": "chart_trending_up",
      "category": "ANALYTICS",
      "enabled": true,
      "url": "/analytics/trends"
    }
  ],
  "categories": [
    {
      "id": "REPORTS",
      "name": "Reports",
      "count": 5
    },
    {
      "id": "STUDENT_MANAGEMENT", 
      "name": "Student Management",
      "count": 8
    },
    {
      "id": "ANALYTICS",
      "name": "Analytics",
      "count": 3
    }
  ]
}
```

## Additional Chart Data Endpoints

### GET /api/dashboard/chart-data/attendance
**Description**: Get formatted data specifically for attendance charts

**Response**:
```json
{
  "chartType": "line",
  "labels": ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
  "datasets": [
    {
      "label": "Attendance Rate",
      "data": [92, 89, 91, 85, 94, 88, 92, 90, 87, 91, 89],
      "borderColor": "#ff6b35",
      "backgroundColor": "rgba(255, 107, 53, 0.1)",
      "tension": 0.4
    },
    {
      "label": "90% Target",
      "data": [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90],
      "borderColor": "#20c997",
      "borderDash": [5, 5],
      "fill": false
    }
  ]
}
```

### GET /api/dashboard/chart-data/enrollment
**Description**: Get formatted data specifically for enrollment trend charts

**Response**:
```json
{
  "chartType": "line",
  "labels": ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
  "datasets": [
    {
      "label": "Student Enrollment",
      "data": [1165, 1178, 1185, 1190, 1205, 1218, 1225, 1235, 1240, 1245, 1247],
      "borderColor": "#ff6b35",
      "backgroundColor": "rgba(255, 107, 53, 0.1)",
      "fill": true,
      "tension": 0.4
    }
  ],
  "annotations": {
    "capacity": {
      "type": "line",
      "value": 1300,
      "label": "Maximum Capacity",
      "borderColor": "#6c757d",
      "borderDash": [10, 5]
    }
  }
}
```

## Caching Strategy

- Dashboard summary: Cache for 5 minutes
- Financial overview: Cache for 10 minutes  
- Recent activities: No cache (real-time)
- Navigation: Cache for 1 hour
- Attendance performance: Cache for 15 minutes
- Enrollment trends: Cache for 30 minutes
- Upcoming events: Cache for 1 hour
- Chart data: Cache for 10 minutes
