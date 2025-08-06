# Classrooms API Endpoint Specifications

Based on the Saint James Admin Portal Classrooms UI, here are the required API endpoints:

## 1. Classrooms Overview Statistics

### GET /api/classrooms/overview
**Description**: Get overall classroom statistics and summary metrics

**Response**:
```json
{
  "statistics": {
    "totalClassrooms": {
      "count": 12,
      "description": "12 active classrooms"
    },
    "totalStudents": {
      "count": 296,
      "description": "Avg 25 students/class",
      "averagePerClass": 25
    },
    "gradeLevels": {
      "count": 6,
      "description": "JSS 1, JSS 2, JSS 3, SS 1, SS 2, SS 3"
    },
    "capacityUsage": {
      "percentage": 87,
      "description": "296 of 340 capacity",
      "current": 296,
      "total": 340
    }
  }
}
```

## 2. Classrooms List with Pagination

### GET /api/classrooms
**Description**: Get paginated list of all classrooms with detailed information

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `view` (optional): "table" | "cards" (default: "table")
- `search` (optional): Search term for classroom name or teacher
- `level` (optional): Filter by grade level (e.g., "JSS1", "SS2")
- `location` (optional): Filter by location/building
- `sortBy` (optional): Sort field ("name", "level", "students", "capacity")
- `sortOrder` (optional): "asc" | "desc" (default: "asc")

**Response**:
```json
{
  "classrooms": [
    {
      "id": "cls_001",
      "serialNumber": 1,
      "name": "JSS 1 Alpha",
      "level": {
        "id": "lvl_jss1",
        "name": "JSS 1",
        "code": "JSS1",
        "badge": {
          "text": "JSS 1",
          "color": "blue"
        }
      },
      "location": {
        "building": "Building A",
        "floor": "Floor 2",
        "roomNumber": "A201",
        "fullAddress": "Building A - Floor 2"
      },
      "classTeacher": {
        "id": "tch_001",
        "name": "Grace Stanford",
        "avatar": "/avatars/grace_stanford.jpg",
        "initials": "GS",
        "title": "Class Teacher"
      },
      "classCaptain": {
        "id": "std_001",
        "name": "Adebayo Olumide",
        "studentId": "JSS1A/07",
        "initials": "AO",
        "badge": {
          "text": "AO",
          "color": "yellow"
        }
      },
      "enrollment": {
        "current": 25,
        "capacity": 30,
        "utilization": 83.3,
        "utilizationColor": "orange",
        "progressBar": {
          "percentage": 83.3,
          "color": "#ff8c00",
          "label": "25/30 students"
        }
      },
      "academicSession": {
        "id": "sess_2024_2025",
        "year": "2024/2025"
      },
      "status": "active",
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T10:00:00Z"
    },
    {
      "id": "cls_002",
      "serialNumber": 2,
      "name": "JSS 1 Beta",
      "level": {
        "id": "lvl_jss1",
        "name": "JSS 1",
        "code": "JSS1",
        "badge": {
          "text": "JSS 1",
          "color": "blue"
        }
      },
      "location": {
        "building": "Building A",
        "floor": "Floor 2",
        "roomNumber": "A202",
        "fullAddress": "Building A - Floor 2"
      },
      "classTeacher": {
        "id": "tch_002",
        "name": "Michael Johnson",
        "avatar": "/avatars/michael_johnson.jpg",
        "initials": "MJ",
        "title": "Class Teacher"
      },
      "classCaptain": {
        "id": "std_002",
        "name": "Fatima Mohammed",
        "studentId": "JSS1B/02",
        "initials": "FM",
        "badge": {
          "text": "FM",
          "color": "yellow"
        }
      },
      "enrollment": {
        "current": 22,
        "capacity": 30,
        "utilization": 73.3,
        "utilizationColor": "green",
        "progressBar": {
          "percentage": 73.3,
          "color": "#28a745",
          "label": "22/30 students"
        }
      },
      "academicSession": {
        "id": "sess_2024_2025",
        "year": "2024/2025"
      },
      "status": "active",
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T09:30:00Z"
    },
    {
      "id": "cls_003",
      "serialNumber": 3,
      "name": "JSS 2 Ruby",
      "level": {
        "id": "lvl_jss2",
        "name": "JSS 2",
        "code": "JSS2",
        "badge": {
          "text": "JSS 2",
          "color": "purple"
        }
      },
      "location": {
        "building": "Building A",
        "floor": "Floor 2",
        "roomNumber": "A203",
        "fullAddress": "Building A - Floor 2"
      },
      "classTeacher": {
        "id": "tch_003",
        "name": "Sarah Williams",
        "avatar": "/avatars/sarah_williams.jpg",
        "initials": "SW",
        "title": "Class Teacher"
      },
      "classCaptain": {
        "id": "std_003",
        "name": "Chioma Nwankwo",
        "studentId": "JSS2R/03",
        "initials": "CN",
        "badge": {
          "text": "CN",
          "color": "yellow"
        }
      },
      "enrollment": {
        "current": 28,
        "capacity": 30,
        "utilization": 93.3,
        "utilizationColor": "red",
        "progressBar": {
          "percentage": 93.3,
          "color": "#dc3545",
          "label": "28/30 students"
        }
      },
      "academicSession": {
        "id": "sess_2024_2025",
        "year": "2024/2025"
      },
      "status": "active",
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T09:45:00Z"
    },
    {
      "id": "cls_004",
      "serialNumber": 4,
      "name": "JSS 2 Diamond",
      "level": {
        "id": "lvl_jss2",
        "name": "JSS 2",
        "code": "JSS2",
        "badge": {
          "text": "JSS 2",
          "color": "purple"
        }
      },
      "location": {
        "building": "Building A",
        "floor": "Floor 2",
        "roomNumber": "A204",
        "fullAddress": "Building A - Floor 2"
      },
      "classTeacher": {
        "id": "tch_004",
        "name": "David Chen",
        "avatar": "/avatars/david_chen.jpg",
        "initials": "DC",
        "title": "Class Teacher"
      },
      "classCaptain": {
        "id": "std_004",
        "name": "Ibrahim Yusuf",
        "studentId": "JSS2D/04",
        "initials": "IY",
        "badge": {
          "text": "IY",
          "color": "yellow"
        }
      },
      "enrollment": {
        "current": 24,
        "capacity": 30,
        "utilization": 80.0,
        "utilizationColor": "orange",
        "progressBar": {
          "percentage": 80.0,
          "color": "#fd7e14",
          "label": "24/30 students"
        }
      },
      "academicSession": {
        "id": "sess_2024_2025",
        "year": "2024/2025"
      },
      "status": "active",
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T09:15:00Z"
    },
    {
      "id": "cls_005",
      "serialNumber": 5,
      "name": "JSS 3 Emerald",
      "level": {
        "id": "lvl_jss3",
        "name": "JSS 3",
        "code": "JSS3",
        "badge": {
          "text": "JSS 3",
          "color": "green"
        }
      },
      "location": {
        "building": "Building A",
        "floor": "Floor 2",
        "roomNumber": "A205",
        "fullAddress": "Building A - Floor 2"
      },
      "classTeacher": {
        "id": "tch_005",
        "name": "Lisa Anderson",
        "avatar": "/avatars/lisa_anderson.jpg",
        "initials": "LA",
        "title": "Class Teacher"
      },
      "classCaptain": {
        "id": "std_005",
        "name": "Blessing Okoro",
        "studentId": "JSS3E/05",
        "initials": "BO",
        "badge": {
          "text": "BO",
          "color": "yellow"
        }
      },
      "enrollment": {
        "current": 26,
        "capacity": 30,
        "utilization": 86.7,
        "utilizationColor": "orange",
        "progressBar": {
          "percentage": 86.7,
          "color": "#ff8c00",
          "label": "26/30 students"
        }
      },
      "academicSession": {
        "id": "sess_2024_2025",
        "year": "2024/2025"
      },
      "status": "active",
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T08:30:00Z"
    },
    {
      "id": "cls_006",
      "serialNumber": 6,
      "name": "JSS 3 Sapphire",
      "level": {
        "id": "lvl_jss3",
        "name": "JSS 3",
        "code": "JSS3",
        "badge": {
          "text": "JSS 3",
          "color": "green"
        }
      },
      "location": {
        "building": "Building A",
        "floor": "Floor 2",
        "roomNumber": "A206",
        "fullAddress": "Building A - Floor 2"
      },
      "classTeacher": {
        "id": "tch_006",
        "name": "Robert Brown",
        "avatar": "/avatars/robert_brown.jpg",
        "initials": "RB",
        "title": "Class Teacher"
      },
      "classCaptain": {
        "id": "std_006",
        "name": "Daniel Okafor",
        "studentId": "JSS3S/06",
        "initials": "DO",
        "badge": {
          "text": "DO",
          "color": "yellow"
        }
      },
      "enrollment": {
        "current": 23,
        "capacity": 30,
        "utilization": 76.7,
        "utilizationColor": "green",
        "progressBar": {
          "percentage": 76.7,
          "color": "#28a745",
          "label": "23/30 students"
        }
      },
      "academicSession": {
        "id": "sess_2024_2025",
        "year": "2024/2025"
      },
      "status": "active",
      "createdAt": "2024-09-01T00:00:00Z",
      "updatedAt": "2025-08-02T08:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalItems": 12,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "viewSettings": {
    "currentView": "cards",
    "availableViews": ["table", "cards"],
    "cardsPerRow": 5,
    "showProgressBars": true,
    "showUtilizationColors": true
  },
  "filters": {
    "availableLevels": [
      { "id": "lvl_jss1", "name": "JSS 1", "color": "blue", "count": 2 },
      { "id": "lvl_jss2", "name": "JSS 2", "color": "purple", "count": 2 },
      { "id": "lvl_jss3", "name": "JSS 3", "color": "green", "count": 2 },
      { "id": "lvl_ss1", "name": "SS 1", "color": "orange", "count": 2 },
      { "id": "lvl_ss2", "name": "SS 2", "color": "red", "count": 2 },
      { "id": "lvl_ss3", "name": "SS 3", "color": "navy", "count": 2 }
    ],
    "availableLocations": [
      "Building A - Floor 1",
      "Building A - Floor 2",
      "Building B - Floor 1",
      "Building B - Floor 2"
    ],
    "utilizationRanges": [
      { "label": "Under 70%", "color": "green", "min": 0, "max": 70 },
      { "label": "70-85%", "color": "orange", "min": 70, "max": 85 },
      { "label": "Over 85%", "color": "red", "min": 85, "max": 100 }
    ]
  }
}
```

## 2a. Classrooms Card View Data

### GET /api/classrooms/cards
**Description**: Get classroom data optimized for card view layout

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term for classroom name or teacher
- `level` (optional): Filter by grade level
- `utilization` (optional): Filter by utilization range ("low", "medium", "high")

**Response**:
```json
{
  "cards": [
    {
      "id": "cls_001",
      "name": "JSS 1 Alpha",
      "levelBadge": {
        "text": "JSS 1",
        "color": "blue",
        "backgroundColor": "#e3f2fd"
      },
      "classTeacher": {
        "name": "Grace Stanford",
        "initials": "GS",
        "avatar": "/avatars/grace_stanford.jpg",
        "role": "Class Teacher"
      },
      "classCaptain": {
        "name": "Adebayo Olumide",
        "initials": "AO",
        "studentId": "JSS1A/07",
        "badge": {
          "initials": "AO",
          "backgroundColor": "#fff3cd",
          "textColor": "#856404"
        }
      },
      "location": {
        "icon": "map-pin",
        "text": "Building A - Floor 2"
      },
      "enrollment": {
        "current": 25,
        "total": 30,
        "percentage": 83.3,
        "progressBar": {
          "width": "83.3%",
          "color": "#ff8c00",
          "backgroundColor": "#f8f9fa"
        },
        "label": "25/30 students",
        "status": "medium"
      },
      "actions": {
        "view": true,
        "edit": true,
        "delete": false
      }
    }
  ],
  "layout": {
    "cardsPerRow": {
      "desktop": 5,
      "tablet": 3,
      "mobile": 1
    },
    "cardHeight": "auto",
    "spacing": "16px"
  }
}
```

## 3. Single Classroom Details

### GET /api/classrooms/{classroomId}
**Description**: Get detailed information about a specific classroom

**Path Parameters**:
- `classroomId`: Unique identifier for the classroom

**Response**:
```json
{
  "classroom": {
    "id": "cls_001",
    "name": "JSS 1 Alpha",
    "level": {
      "id": "lvl_jss1",
      "name": "JSS 1",
      "code": "JSS1"
    },
    "location": {
      "building": "Building A",
      "floor": "Floor 1",
      "roomNumber": "A101",
      "coordinates": {
        "latitude": 6.5244,
        "longitude": 3.3792
      }
    },
    "classTeacher": {
      "id": "tch_001",
      "name": "Grace Stanford",
      "email": "grace.stanford@saintjames.edu",
      "phone": "+234-800-000-0001",
      "avatar": "/avatars/grace_stanford.jpg",
      "department": "English Department"
    },
    "classCaptain": {
      "id": "std_001",
      "name": "Adebayo Olumide",
      "studentId": "JSS1A/07",
      "email": "adebayo.olumide@student.saintjames.edu",
      "guardian": {
        "name": "Mrs. Olumide Adebayo",
        "phone": "+234-800-000-0100"
      }
    },
    "students": {
      "total": 25,
      "present": 23,
      "absent": 2,
      "capacity": 30,
      "utilization": 83.3
    },
    "subjects": [
      {
        "id": "subj_001",
        "name": "Mathematics",
        "teacher": {
          "id": "tch_003",
          "name": "Dr. Ahmed Bello"
        }
      },
      {
        "id": "subj_002",
        "name": "English Language",
        "teacher": {
          "id": "tch_001",
          "name": "Grace Stanford"
        }
      }
    ],
    "schedule": {
      "monday": [
        {
          "time": "08:00-09:00",
          "subject": "Mathematics",
          "teacher": "Dr. Ahmed Bello"
        }
      ]
    },
    "academicSession": {
      "id": "sess_2024_2025",
      "year": "2024/2025",
      "currentTerm": "Second Term"
    },
    "performance": {
      "averageAttendance": 92.0,
      "averageGrade": "B+",
      "topPerformers": 8,
      "needsAttention": 3
    }
  }
}
```

## 4. Top Class Champions

### GET /api/classrooms/top-champions
**Description**: Get list of top performing classrooms (Top Class Champions) with detailed metrics and rankings

**Query Parameters**:
- `metric` (optional): "attendance" | "grades" | "overall" | "assessment" (default: "overall")
- `limit` (optional): Number of classrooms to return (default: 6)
- `period` (optional): "current_term" | "current_session" | "last_month" (default: "current_term")

**Response**:
```json
{
  "champions": [
    {
      "rank": 1,
      "classroom": {
        "id": "cls_003",
        "name": "JSS 2 Ruby",
        "level": {
          "id": "lvl_jss2",
          "name": "JSS 2",
          "code": "JSS2"
        }
      },
      "classTeacher": {
        "id": "tch_003",
        "name": "Grace Stanford",
        "avatar": "/avatars/grace_stanford.jpg",
        "initials": "GS"
      },
      "metrics": {
        "overall": {
          "score": 95.0,
          "label": "Avg 95%",
          "trend": "up"
        },
        "attendance": 94.5,
        "academicPerformance": 96.2,
        "behaviorScore": 94.3
      },
      "badge": {
        "icon": "trophy",
        "color": "gold",
        "position": "1st"
      },
      "achievements": [
        "Highest attendance rate",
        "Best academic performance",
        "Excellent discipline record"
      ]
    },
    {
      "rank": 2,
      "classroom": {
        "id": "cls_007",
        "name": "SS 1 Gold",
        "level": {
          "id": "lvl_ss1",
          "name": "SS 1",
          "code": "SS1"
        }
      },
      "classTeacher": {
        "id": "tch_007",
        "name": "Michael Johnson",
        "avatar": "/avatars/michael_johnson.jpg",
        "initials": "MJ"
      },
      "metrics": {
        "overall": {
          "score": 87.0,
          "label": "Avg 87%",
          "trend": "up"
        },
        "attendance": 88.2,
        "academicPerformance": 86.5,
        "behaviorScore": 86.3
      },
      "badge": {
        "icon": "medal",
        "color": "silver",
        "position": "2nd"
      },
      "achievements": [
        "Consistent improvement",
        "Strong team collaboration"
      ]
    },
    {
      "rank": 3,
      "classroom": {
        "id": "cls_005",
        "name": "JSS 3 Emerald",
        "level": {
          "id": "lvl_jss3",
          "name": "JSS 3",
          "code": "JSS3"
        }
      },
      "classTeacher": {
        "id": "tch_005",
        "name": "Jennifer Davis",
        "avatar": "/avatars/jennifer_davis.jpg",
        "initials": "JD"
      },
      "metrics": {
        "overall": {
          "score": 80.0,
          "label": "Avg 80%",
          "trend": "stable"
        },
        "attendance": 81.5,
        "academicPerformance": 79.2,
        "behaviorScore": 79.3
      },
      "badge": {
        "icon": "award",
        "color": "bronze",
        "position": "3rd"
      },
      "achievements": [
        "Most improved class",
        "Outstanding creativity"
      ]
    },
    {
      "rank": 4,
      "classroom": {
        "id": "cls_009",
        "name": "SS 2 Phoenix",
        "level": {
          "id": "lvl_ss2",
          "name": "SS 2",
          "code": "SS2"
        }
      },
      "classTeacher": {
        "id": "tch_009",
        "name": "Thomas Miller",
        "avatar": "/avatars/thomas_miller.jpg",
        "initials": "TM"
      },
      "metrics": {
        "overall": {
          "score": 76.0,
          "label": "Avg 76%",
          "trend": "up"
        },
        "attendance": 77.8,
        "academicPerformance": 75.1,
        "behaviorScore": 75.1
      },
      "badge": {
        "icon": "star",
        "color": "blue",
        "position": "4th"
      },
      "achievements": [
        "Leadership excellence",
        "Community service"
      ]
    },
    {
      "rank": 5,
      "classroom": {
        "id": "cls_001",
        "name": "JSS 1 Alpha",
        "level": {
          "id": "lvl_jss1",
          "name": "JSS 1",
          "code": "JSS1"
        }
      },
      "classTeacher": {
        "id": "tch_001",
        "name": "Lisa Anderson",
        "avatar": "/avatars/lisa_anderson.jpg",
        "initials": "LA"
      },
      "metrics": {
        "overall": {
          "score": 68.0,
          "label": "Avg 68%",
          "trend": "up"
        },
        "attendance": 69.5,
        "academicPerformance": 67.2,
        "behaviorScore": 67.3
      },
      "badge": {
        "icon": "thumbs-up",
        "color": "green",
        "position": "5th"
      },
      "achievements": [
        "Best newcomer class",
        "Rapid adaptation"
      ]
    },
    {
      "rank": 6,
      "classroom": {
        "id": "cls_011",
        "name": "SS 3 Crown",
        "level": {
          "id": "lvl_ss3",
          "name": "SS 3",
          "code": "SS3"
        }
      },
      "classTeacher": {
        "id": "tch_011",
        "name": "Amanda Taylor",
        "avatar": "/avatars/amanda_taylor.jpg",
        "initials": "AT"
      },
      "metrics": {
        "overall": {
          "score": 62.0,
          "label": "Avg 62%",
          "trend": "stable"
        },
        "attendance": 63.1,
        "academicPerformance": 61.5,
        "behaviorScore": 61.4
      },
      "badge": {
        "icon": "certificate",
        "color": "purple",
        "position": "6th"
      },
      "achievements": [
        "Academic focus",
        "Exam preparation excellence"
      ]
    }
  ],
  "metadata": {
    "title": "Top Class Champions",
    "subtitle": "View the highest performing classrooms and their achievements",
    "lastUpdated": "2025-08-02T21:48:00Z",
    "basedOn": "Based on latest assessment results",
    "assessmentPeriod": "Current Term (Second Term 2024/2025)",
    "totalClassrooms": 12,
    "evaluationCriteria": {
      "academicPerformance": 40,
      "attendance": 30,
      "behavior": 20,
      "participation": 10
    }
  },
  "trends": {
    "improving": 4,
    "stable": 2,
    "declining": 0
  }
}
```

### GET /api/classrooms/champions-summary
**Description**: Get summarized data for the Top Class Champions panel header

**Response**:
```json
{
  "summary": {
    "title": "Top Class Champions",
    "subtitle": "View the highest performing classrooms and their achievements",
    "totalChampions": 6,
    "lastUpdated": "2025-08-02T21:48:00Z",
    "updateFrequency": "Updated daily based on latest results"
  },
  "quickStats": {
    "topPerformer": {
      "className": "JSS 2 Ruby",
      "teacher": "Grace Stanford",
      "score": 95.0
    },
    "averageScore": 78.0,
    "improvingClasses": 4,
    "totalParticipating": 12
  }
}
```

### GET /api/classrooms/{classroomId}/champion-details
**Description**: Get detailed champion information for a specific classroom

**Path Parameters**:
- `classroomId`: Unique identifier for the classroom

**Response**:
```json
{
  "championDetails": {
    "classroom": {
      "id": "cls_003",
      "name": "JSS 2 Ruby",
      "level": "JSS 2"
    },
    "currentRank": 1,
    "previousRank": 3,
    "rankChange": 2,
    "metrics": {
      "overall": {
        "current": 95.0,
        "previous": 87.5,
        "change": 7.5,
        "trend": "improving"
      },
      "breakdown": {
        "academicPerformance": {
          "score": 96.2,
          "weight": 40,
          "contribution": 38.48
        },
        "attendance": {
          "score": 94.5,
          "weight": 30,
          "contribution": 28.35
        },
        "behavior": {
          "score": 94.3,
          "weight": 20,
          "contribution": 18.86
        },
        "participation": {
          "score": 93.1,
          "weight": 10,
          "contribution": 9.31
        }
      }
    },
    "achievements": [
      {
        "title": "Highest attendance rate",
        "description": "94.5% attendance - highest in school",
        "dateEarned": "2025-07-30",
        "icon": "calendar-check"
      },
      {
        "title": "Best academic performance",
        "description": "96.2% average in assessments",
        "dateEarned": "2025-07-28",
        "icon": "academic-cap"
      },
      {
        "title": "Excellent discipline record",
        "description": "Zero disciplinary issues this term",
        "dateEarned": "2025-07-25",
        "icon": "shield-check"
      }
    ],
    "historicalPerformance": [
      {
        "period": "First Term",
        "rank": 3,
        "score": 87.5
      },
      {
        "period": "Second Term",
        "rank": 1,
        "score": 95.0
      }
    ],
    "classTeacher": {
      "id": "tch_003",
      "name": "Grace Stanford",
      "achievements": [
        "Teacher of the Month - July 2025",
        "Best Class Management Award"
      ]
    }
  }
}
```
```

## 5. Create New Classroom

### POST /api/classrooms
**Description**: Create a new classroom

**Request Body**:
```json
{
  "name": "JSS 1 Gamma",
  "levelId": "lvl_jss1",
  "academicSessionId": "sess_2024_2025",
  "location": {
    "building": "Building A",
    "floor": "Floor 1",
    "roomNumber": "A103"
  },
  "capacity": 30,
  "classTeacherId": "tch_004",
  "departmentId": "dept_001"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Classroom created successfully",
  "classroom": {
    "id": "cls_013",
    "name": "JSS 1 Gamma",
    "level": {
      "id": "lvl_jss1",
      "name": "JSS 1"
    },
    "location": {
      "building": "Building A",
      "floor": "Floor 1",
      "roomNumber": "A103"
    },
    "capacity": 30,
    "studentCount": 0,
    "status": "active",
    "createdAt": "2025-08-02T15:30:00Z"
  }
}
```

## 6. Update Classroom

### PUT /api/classrooms/{classroomId}
**Description**: Update classroom information

**Path Parameters**:
- `classroomId`: Unique identifier for the classroom

**Request Body**:
```json
{
  "name": "JSS 1 Alpha Updated",
  "capacity": 32,
  "classTeacherId": "tch_005",
  "location": {
    "building": "Building A",
    "floor": "Floor 1",
    "roomNumber": "A101"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Classroom updated successfully",
  "classroom": {
    "id": "cls_001",
    "name": "JSS 1 Alpha Updated",
    "capacity": 32,
    "updatedAt": "2025-08-02T15:45:00Z"
  }
}
```

## 7. Assign Class Captain

### POST /api/classrooms/{classroomId}/assign-captain
**Description**: Assign or change class captain for a classroom

**Path Parameters**:
- `classroomId`: Unique identifier for the classroom

**Request Body**:
```json
{
  "studentId": "std_001",
  "effectiveDate": "2025-08-03"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Class captain assigned successfully",
  "classCaptain": {
    "id": "std_001",
    "name": "Adebayo Olumide",
    "studentId": "JSS1A/07",
    "assignedDate": "2025-08-03T00:00:00Z"
  }
}
```

## 8. Classroom Students

### GET /api/classrooms/{classroomId}/students
**Description**: Get list of students in a specific classroom

**Path Parameters**:
- `classroomId`: Unique identifier for the classroom

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): "active" | "inactive" | "transferred"
- `search` (optional): Search by student name or ID

**Response**:
```json
{
  "students": [
    {
      "id": "std_001",
      "name": "Adebayo Olumide",
      "studentId": "JSS1A/07",
      "avatar": "/avatars/student_001.jpg",
      "email": "adebayo.olumide@student.saintjames.edu",
      "phone": "+234-800-000-0100",
      "guardian": {
        "name": "Mrs. Olumide Adebayo",
        "phone": "+234-800-000-0100",
        "relationship": "Mother"
      },
      "enrollmentDate": "2024-09-01",
      "status": "active",
      "isClassCaptain": true,
      "performance": {
        "attendanceRate": 94.5,
        "averageGrade": "B+",
        "rank": 3
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalItems": 25,
    "itemsPerPage": 20
  },
  "summary": {
    "totalStudents": 25,
    "activeStudents": 25,
    "averageAge": 12,
    "genderDistribution": {
      "male": 13,
      "female": 12
    }
  }
}
```

## 9. Classroom Schedule

### GET /api/classrooms/{classroomId}/schedule
**Description**: Get weekly schedule for a classroom

**Path Parameters**:
- `classroomId`: Unique identifier for the classroom

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
        "teacher": {
          "id": "tch_003",
          "name": "Dr. Ahmed Bello",
          "avatar": "/avatars/ahmed_bello.jpg"
        },
        "room": "A101"
      },
      {
        "period": 2,
        "time": "09:00-10:00",
        "subject": {
          "id": "subj_002",
          "name": "English Language"
        },
        "teacher": {
          "id": "tch_001",
          "name": "Grace Stanford",
          "avatar": "/avatars/grace_stanford.jpg"
        },
        "room": "A101"
      }
    ],
    "tuesday": [],
    "wednesday": [],
    "thursday": [],
    "friday": []
  },
  "metadata": {
    "week": "2025-W31",
    "startDate": "2025-07-28",
    "endDate": "2025-08-01",
    "totalPeriods": 35,
    "freePeriodsCount": 5
  }
}
```

## 10. Search and Filter Options

### GET /api/classrooms/filters
**Description**: Get available filter options for classrooms

**Response**:
```json
{
  "levels": [
    { "id": "lvl_jss1", "name": "JSS 1", "classroomCount": 2 },
    { "id": "lvl_jss2", "name": "JSS 2", "classroomCount": 2 },
    { "id": "lvl_jss3", "name": "JSS 3", "classroomCount": 2 },
    { "id": "lvl_ss1", "name": "SS 1", "classroomCount": 2 },
    { "id": "lvl_ss2", "name": "SS 2", "classroomCount": 2 },
    { "id": "lvl_ss3", "name": "SS 3", "classroomCount": 2 }
  ],
  "buildings": [
    { "name": "Building A", "floors": ["Floor 1", "Floor 2"], "classroomCount": 8 },
    { "name": "Building B", "floors": ["Floor 1", "Floor 2"], "classroomCount": 4 }
  ],
  "departments": [
    { "id": "dept_001", "name": "Science Department", "classroomCount": 4 },
    { "id": "dept_002", "name": "Arts Department", "classroomCount": 4 },
    { "id": "dept_003", "name": "Commercial Department", "classroomCount": 4 }
  ],
  "academicSessions": [
    { "id": "sess_2024_2025", "year": "2024/2025", "isCurrent": true },
    { "id": "sess_2023_2024", "year": "2023/2024", "isCurrent": false }
  ]
}
```

## Error Responses

All endpoints should return consistent error responses:

```json
{
  "error": {
    "code": "CLASSROOM_NOT_FOUND",
    "message": "Classroom with ID 'cls_999' not found.",
    "details": {
      "classroomId": "cls_999"
    }
  }
}
```

## Security & Authentication

- All endpoints require authentication via JWT token
- Admin or Teacher role required for read access
- Admin role required for create/update/delete operations
- Class teachers can only modify their own classrooms
- Rate limiting: 100 requests per minute per user
- Input validation for all POST/PUT requests

## Caching Strategy

- Classrooms overview: Cache for 10 minutes
- Classrooms list: Cache for 5 minutes
- Classrooms card view: Cache for 5 minutes
- Single classroom details: Cache for 15 minutes
- Top class champions: Cache for 20 minutes
- Champions summary: Cache for 15 minutes
- Champion details: Cache for 30 minutes
- Schedule data: Cache for 1 hour
- Filter options: Cache for 1 hour

## Additional UI-Specific Endpoints

### GET /api/classrooms/utilization-colors
**Description**: Get color coding for classroom utilization percentages

**Response**:
```json
{
  "utilizationColors": {
    "ranges": [
      {
        "min": 0,
        "max": 70,
        "color": "#28a745",
        "label": "Good",
        "description": "Optimal capacity usage"
      },
      {
        "min": 70,
        "max": 85,
        "color": "#fd7e14",
        "label": "Medium",
        "description": "Moderate capacity usage"
      },
      {
        "min": 85,
        "max": 95,
        "color": "#ff8c00",
        "label": "High",
        "description": "High capacity usage"
      },
      {
        "min": 95,
        "max": 100,
        "color": "#dc3545",
        "label": "Critical",
        "description": "Near maximum capacity"
      }
    ]
  }
}
```

### GET /api/classrooms/level-badges
**Description**: Get badge styling for different grade levels

**Response**:
```json
{
  "levelBadges": {
    "JSS1": {
      "text": "JSS 1",
      "backgroundColor": "#e3f2fd",
      "textColor": "#1976d2",
      "borderColor": "#bbdefb"
    },
    "JSS2": {
      "text": "JSS 2", 
      "backgroundColor": "#f3e5f5",
      "textColor": "#7b1fa2",
      "borderColor": "#ce93d8"
    },
    "JSS3": {
      "text": "JSS 3",
      "backgroundColor": "#e8f5e8",
      "textColor": "#388e3c",
      "borderColor": "#a5d6a7"
    },
    "SS1": {
      "text": "SS 1",
      "backgroundColor": "#fff3e0",
      "textColor": "#f57c00",
      "borderColor": "#ffcc02"
    },
    "SS2": {
      "text": "SS 2",
      "backgroundColor": "#ffebee",
      "textColor": "#d32f2f",
      "borderColor": "#ffcdd2"
    },
    "SS3": {
      "text": "SS 3",
      "backgroundColor": "#e8eaf6",
      "textColor": "#303f9f",
      "borderColor": "#c5cae9"
    }
  }
}
```
