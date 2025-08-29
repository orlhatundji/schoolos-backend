# Academic Calendar Management API Specifications

## Overview

The Academic Calendar Management API allows school administrators to create, manage, and view calendar events for their academic sessions. The API provides endpoints for creating events, fetching calendar data with various filters, and managing the academic calendar.

## Base URL

All endpoints are prefixed with `/api/academic-calendar`

## Authentication

All endpoints require authentication using JWT Bearer token:
```
Authorization: Bearer {jwt_token}
```

## Endpoints

### 1. Create Calendar Event

**Endpoint:** `POST /api/academic-calendar/events`

**Description:** Creates a new calendar event for an academic session.

**Request Body:**
```json
{
  "title": "string (required)",
  "academicSessionId": "uuid (required)",
  "startDate": "datetime (required, ISO 8601 format)",
  "endDate": "datetime (optional, ISO 8601 format)"
}
```

**Example Request:**
```json
{
  "title": "First Term Begins",
  "academicSessionId": "123e4567-e89b-12d3-a456-426614174000",
  "startDate": "2024-09-01T00:00:00.000Z",
  "endDate": "2024-09-01T23:59:59.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "status": 201,
  "message": "Calendar event created successfully",
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "title": "First Term Begins",
    "startDate": "2024-09-01T00:00:00.000Z",
    "endDate": "2024-09-01T23:59:59.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "calendar": {
      "id": "789e0123-e89b-12d3-a456-426614174002",
      "academicSession": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "academicYear": "2024/2025",
        "startDate": "2024-09-01T00:00:00.000Z",
        "endDate": "2025-07-31T23:59:59.000Z",
        "isCurrent": true,
        "terms": [
          {
            "id": "term-1",
            "name": "First Term"
          },
          {
            "id": "term-2", 
            "name": "Second Term"
          }
        ]
      }
    }
  }
}
```

### 2. Get Calendar Events

**Endpoint:** `GET /api/academic-calendar/events`

**Description:** Retrieves calendar events with optional filtering and pagination.

**Query Parameters:**
- `academicSessionId` (optional): Filter events by academic session ID
- `startDate` (optional): Filter events from this date (YYYY-MM-DD format)
- `endDate` (optional): Filter events until this date (YYYY-MM-DD format)
- `month` (optional): Filter events by month (1-12)
- `year` (optional): Filter events by year
- `termId` (optional): Filter events by term ID
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 20, max: 100)

**Example Request:**
```
GET /api/academic-calendar/events?month=9&year=2024&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "status": 200,
  "message": "Calendar events fetched successfully",
  "data": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "title": "First Term Begins",
      "startDate": "2024-09-01T00:00:00.000Z",
      "endDate": "2024-09-01T23:59:59.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "calendar": {
        "id": "789e0123-e89b-12d3-a456-426614174002",
        "academicSession": {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "academicYear": "2024/2025",
          "startDate": "2024-09-01T00:00:00.000Z",
          "endDate": "2025-07-31T23:59:59.000Z",
          "isCurrent": true,
          "terms": [
            {
              "id": "term-1",
              "name": "First Term"
            }
          ]
        }
      }
    }
  ]
}
```

### 3. Get Single Calendar Event

**Endpoint:** `GET /api/academic-calendar/events/{eventId}`

**Description:** Retrieves a specific calendar event by ID.

**Path Parameters:**
- `eventId` (required): The ID of the calendar event

**Example Request:**
```
GET /api/academic-calendar/events/456e7890-e89b-12d3-a456-426614174001
```

**Response:**
```json
{
  "success": true,
  "status": 200,
  "message": "Calendar event fetched successfully",
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "title": "First Term Begins",
    "startDate": "2024-09-01T00:00:00.000Z",
    "endDate": "2024-09-01T23:59:59.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "calendar": {
      "id": "789e0123-e89b-12d3-a456-426614174002",
      "academicSession": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "academicYear": "2024/2025",
        "startDate": "2024-09-01T00:00:00.000Z",
        "endDate": "2025-07-31T23:59:59.000Z",
        "isCurrent": true,
        "terms": [
          {
            "id": "term-1",
            "name": "First Term"
          }
        ]
      }
    }
  }
}
```

### 4. Update Calendar Event

**Endpoint:** `PATCH /api/academic-calendar/events/{eventId}`

**Description:** Updates an existing calendar event.

**Path Parameters:**
- `eventId` (required): The ID of the calendar event to update

**Request Body:**
```json
{
  "title": "string (optional)",
  "startDate": "datetime (optional, ISO 8601 format)",
  "endDate": "datetime (optional, ISO 8601 format)"
}
```

**Example Request:**
```json
{
  "title": "First Term Begins - Updated",
  "startDate": "2024-09-02T00:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "status": 200,
  "message": "Calendar event updated successfully",
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "title": "First Term Begins - Updated",
    "startDate": "2024-09-02T00:00:00.000Z",
    "endDate": "2024-09-01T23:59:59.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z",
    "calendar": {
      "id": "789e0123-e89b-12d3-a456-426614174002",
      "academicSession": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "academicYear": "2024/2025",
        "startDate": "2024-09-01T00:00:00.000Z",
        "endDate": "2025-07-31T23:59:59.000Z",
        "isCurrent": true,
        "terms": [
          {
            "id": "term-1",
            "name": "First Term"
          }
        ]
      }
    }
  }
}
```

### 5. Delete Calendar Event

**Endpoint:** `DELETE /api/academic-calendar/events/{eventId}`

**Description:** Deletes a calendar event.

**Path Parameters:**
- `eventId` (required): The ID of the calendar event to delete

**Example Request:**
```
DELETE /api/academic-calendar/events/456e7890-e89b-12d3-a456-426614174001
```

**Response:**
```json
{
  "success": true,
  "status": 200,
  "message": "Calendar event deleted successfully",
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "title": "First Term Begins - Updated",
    "startDate": "2024-09-02T00:00:00.000Z",
    "endDate": "2024-09-01T23:59:59.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z",
    "calendar": {
      "id": "789e0123-e89b-12d3-a456-426614174002",
      "academicSession": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "academicYear": "2024/2025",
        "startDate": "2024-09-01T00:00:00.000Z",
        "endDate": "2025-07-31T23:59:59.000Z",
        "isCurrent": true,
        "terms": [
          {
            "id": "term-1",
            "name": "First Term"
          }
        ]
      }
    }
  }
}
```

### 6. Get Academic Calendar

**Endpoint:** `GET /api/academic-calendar/calendar`

**Description:** Retrieves the complete academic calendar with all events. This endpoint is similar to the events endpoint but is specifically designed for calendar views.

**Query Parameters:** Same as the events endpoint

**Example Request:**
```
GET /api/academic-calendar/calendar?academicSessionId=123e4567-e89b-12d3-a456-426614174000
```

**Response:** Same format as the events endpoint

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "status": 400,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error details"
  }
}
```

### Common Error Codes:

- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found (event, academic session, etc.)
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `USER_NOT_ASSOCIATED_WITH_SCHOOL`: User is not associated with any school
- `ACADEMIC_SESSION_NOT_FOUND`: Academic session not found

## Usage Examples

### 1. Create Events for a New Academic Session

```bash
# Create first term begins event
curl -X POST /api/academic-calendar/events \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "First Term Begins",
    "academicSessionId": "session-id",
    "startDate": "2024-09-01T00:00:00.000Z"
  }'

# Create midterm break event
curl -X POST /api/academic-calendar/events \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Midterm Break",
    "academicSessionId": "session-id",
    "startDate": "2024-10-15T00:00:00.000Z",
    "endDate": "2024-10-19T23:59:59.000Z"
  }'
```

### 2. Get Events for a Specific Month

```bash
curl -X GET "/api/academic-calendar/events?month=9&year=2024" \
  -H "Authorization: Bearer {token}"
```

### 3. Get Events for a Date Range

```bash
curl -X GET "/api/academic-calendar/events?startDate=2024-09-01&endDate=2024-12-31" \
  -H "Authorization: Bearer {token}"
```

### 4. Get All Events for an Academic Session

```bash
curl -X GET "/api/academic-calendar/events?academicSessionId=session-id" \
  -H "Authorization: Bearer {token}"
```

## Data Models

### Calendar Event
```typescript
interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  calendar: {
    id: string;
    academicSession: {
      id: string;
      academicYear: string;
      startDate: Date;
      endDate: Date;
      isCurrent: boolean;
      terms: Term[];
    };
  };
}
```

### Term
```typescript
interface Term {
  id: string;
  name: string;
}
```

## Notes

1. **Date Format**: All dates should be provided in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
2. **Timezone**: All dates are stored and returned in UTC
3. **Pagination**: The events endpoints support pagination with a default limit of 20 items per page
4. **Filtering**: Multiple filters can be combined (e.g., month + year + academic session)
5. **Authorization**: Users can only access calendar events for their associated school
6. **Auto-calendar Creation**: If a calendar doesn't exist for an academic session, it will be created automatically when the first event is added
