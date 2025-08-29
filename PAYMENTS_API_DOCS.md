# Payments Management API Documentation

## Overview

The Payments Management System allows schools to create and manage payment structures that can be applied to different categories of students. The system supports various payment frequencies, categories, and scopes (session, term, level, class arm, or individual students).

## Key Features

- **Payment Structures**: Define payment templates with amounts, frequencies, and categories
- **Flexible Scoping**: Apply payments to academic sessions, terms, levels, class arms, or individual students
- **Student Payment Generation**: Automatically generate individual student payment records
- **Payment Tracking**: Track payment status, amounts paid, and due dates
- **Payment Management**: Mark payments as paid, partial, or waived
- **Statistics & Reporting**: Get comprehensive payment statistics and reports

## Database Schema

### Payment Structure
- **name**: Payment structure name (e.g., "First Term Tuition")
- **description**: Optional description
- **amount**: Payment amount
- **currency**: Currency code (default: NGN)
- **category**: Payment category (TUITION, EXAMINATION, LIBRARY, etc.)
- **frequency**: Payment frequency (ONCE_PER_SESSION, ONCE_PER_TERM, etc.)
- **scope**: Academic session, term, level, or class arm
- **dueDate**: Custom due date
- **isActive**: Whether the payment structure is active

### Student Payment
- **studentId**: Reference to student
- **paymentStructureId**: Reference to payment structure
- **amount**: Payment amount
- **status**: Payment status (PENDING, PAID, PARTIAL, OVERDUE, WAIVED)
- **dueDate**: Due date for the payment
- **paidAmount**: Amount paid so far
- **paidAt**: Date when payment was made
- **waivedBy**: User who waived the payment
- **waiverReason**: Reason for waiving

## API Endpoints

### Payment Structures

#### 1. Create Payment Structure

**Endpoint:** `POST /payment-structures`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "name": "First Term Tuition",
  "description": "Tuition fees for the first term",
  "amount": 50000,
  "currency": "NGN",
  "category": "TUITION",
  "frequency": "ONCE_PER_TERM",
  "academicSessionId": "uuid",
  "termId": "uuid",
  "levelId": "uuid",
  "classArmId": "uuid",
  "dueDate": "2025-09-30T00:00:00.000Z",
  "isActive": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "First Term Tuition",
  "description": "Tuition fees for the first term",
  "amount": 50000,
  "currency": "NGN",
  "category": "TUITION",
  "frequency": "ONCE_PER_TERM",
  "academicSessionId": "uuid",
  "termId": "uuid",
  "levelId": "uuid",
  "classArmId": "uuid",
  "dueDate": "2025-09-30T00:00:00.000Z",
  "isActive": true,
  "schoolId": "uuid",
  "createdAt": "2025-08-28T22:00:00.000Z",
  "updatedAt": "2025-08-28T22:00:00.000Z",
  "academicSession": { ... },
  "term": { ... },
  "level": { ... },
  "classArm": { ... }
}
```

#### 2. Get All Payment Structures

**Endpoint:** `GET /payment-structures`

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "First Term Tuition",
    "description": "Tuition fees for the first term",
    "amount": 50000,
    "currency": "NGN",
    "category": "TUITION",
    "frequency": "ONCE_PER_TERM",
    "isActive": true,
    "createdAt": "2025-08-28T22:00:00.000Z",
    "updatedAt": "2025-08-28T22:00:00.000Z",
    "_count": {
      "studentPayments": 25
    }
  }
]
```

#### 3. Get Payment Structure by ID

**Endpoint:** `GET /payment-structures/{id}`

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "id": "uuid",
  "name": "First Term Tuition",
  "description": "Tuition fees for the first term",
  "amount": 50000,
  "currency": "NGN",
  "category": "TUITION",
  "frequency": "ONCE_PER_TERM",
  "isActive": true,
  "createdAt": "2025-08-28T22:00:00.000Z",
  "updatedAt": "2025-08-28T22:00:00.000Z",
  "studentPayments": [
    {
      "id": "uuid",
      "studentId": "uuid",
      "amount": 50000,
      "status": "PENDING",
      "dueDate": "2025-09-30T00:00:00.000Z",
      "student": {
        "id": "uuid",
        "studentNo": "STU001",
        "user": {
          "firstName": "John",
          "lastName": "Doe"
        },
        "classArm": {
          "name": "SS1A",
          "level": {
            "name": "Senior Secondary 1"
          }
        }
      }
    }
  ]
}
```

#### 4. Update Payment Structure

**Endpoint:** `PATCH /payment-structures/{id}`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "name": "Updated First Term Tuition",
  "amount": 55000,
  "dueDate": "2025-10-15T00:00:00.000Z"
}
```

#### 5. Delete Payment Structure

**Endpoint:** `DELETE /payment-structures/{id}`

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "message": "Payment structure deleted successfully"
}
```

#### 6. Generate Student Payments

**Endpoint:** `POST /payment-structures/{id}/generate-payments`

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "message": "Generated 25 student payments",
  "count": 25
}
```

### Student Payments

#### 1. Get All Student Payments

**Endpoint:** `GET /student-payments`

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `status`: Filter by payment status (PENDING, PAID, PARTIAL, OVERDUE, WAIVED)
- `studentId`: Filter by student ID
- `paymentStructureId`: Filter by payment structure ID
- `dueDateFrom`: Filter by due date from (YYYY-MM-DD)
- `dueDateTo`: Filter by due date to (YYYY-MM-DD)

**Response:**
```json
[
  {
    "id": "uuid",
    "studentId": "uuid",
    "paymentStructureId": "uuid",
    "amount": 50000,
    "currency": "NGN",
    "status": "PENDING",
    "dueDate": "2025-09-30T00:00:00.000Z",
    "paidAmount": 0,
    "paidAt": null,
    "createdAt": "2025-08-28T22:00:00.000Z",
    "student": {
      "id": "uuid",
      "studentNo": "STU001",
      "user": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "classArm": {
        "name": "SS1A",
        "level": {
          "name": "Senior Secondary 1"
        }
      }
    },
    "paymentStructure": {
      "id": "uuid",
      "name": "First Term Tuition",
      "category": "TUITION",
      "frequency": "ONCE_PER_TERM"
    }
  }
]
```

#### 2. Get Payment Statistics

**Endpoint:** `GET /student-payments/statistics`

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "totalAmount": 1250000,
  "totalPaid": 750000,
  "totalPending": 500000,
  "statusCounts": {
    "PENDING": 15,
    "PAID": 8,
    "PARTIAL": 2,
    "OVERDUE": 5,
    "WAIVED": 1
  },
  "overdueCount": 5,
  "totalPayments": 31
}
```

#### 3. Get Student Payment by ID

**Endpoint:** `GET /student-payments/{id}`

**Headers:** `Authorization: Bearer {token}`

#### 4. Get Payments by Student

**Endpoint:** `GET /student-payments/student/{studentId}`

**Headers:** `Authorization: Bearer {token}`

#### 5. Update Student Payment

**Endpoint:** `PATCH /student-payments/{id}`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "status": "PARTIAL",
  "paidAmount": 25000,
  "paidAt": "2025-08-28T22:00:00.000Z",
  "notes": "Partial payment received"
}
```

#### 6. Mark Payment as Paid

**Endpoint:** `POST /student-payments/{id}/mark-paid`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "paidAmount": 50000,
  "paidAt": "2025-08-28T22:00:00.000Z"
}
```

#### 7. Waive Payment

**Endpoint:** `POST /student-payments/{id}/waive`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "waiverReason": "Financial hardship - approved by principal"
}
```

## Payment Categories

- **TUITION**: Regular tuition fees
- **EXAMINATION**: Examination fees
- **LIBRARY**: Library fees
- **LABORATORY**: Laboratory fees
- **SPORTS**: Sports and physical education fees
- **TRANSPORT**: Transportation fees
- **UNIFORM**: Uniform fees
- **TEXTBOOK**: Textbook fees
- **EXCURSION**: Field trip and excursion fees
- **OTHER**: Miscellaneous fees

## Payment Frequencies

- **ONCE_PER_SESSION**: Payment due once per academic session
- **ONCE_PER_TERM**: Payment due once per term
- **MONTHLY**: Payment due monthly
- **WEEKLY**: Payment due weekly
- **CUSTOM**: Custom frequency with specific due date

## Payment Statuses

- **PENDING**: Payment is due but not yet paid
- **PAID**: Payment has been fully paid
- **PARTIAL**: Partial payment has been made
- **OVERDUE**: Payment is past due date
- **WAIVED**: Payment has been waived

## Authentication & Authorization

All endpoints require:
- **JWT Bearer Token**: Valid authentication token
- **School Association**: User must be associated with a school
- **ManageStudentPolicy**: User must have permission to manage students

## Error Responses

### Common Error Codes:
- **400 Bad Request**: Invalid data format, validation errors, or business rule violations
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side error

### Example Error Response:
```json
{
  "statusCode": 400,
  "message": "Cannot delete payment structure. It has associated student payments. Please remove all student payments first.",
  "error": "Bad Request"
}
```

## Business Rules

### Payment Structure Rules:
1. **Scope Validation**: Academic session, term, level, and class arm must belong to the user's school
2. **Duplicate Prevention**: Cannot create duplicate payment structures for the same scope
3. **Deletion Protection**: Cannot delete payment structures with associated student payments

### Student Payment Rules:
1. **Status Transitions**: Only valid status transitions are allowed
2. **Amount Validation**: Paid amount cannot exceed total amount
3. **Waiver Requirements**: Both waivedBy and waiverReason are required for waivers
4. **Payment Protection**: Cannot waive payments that are already paid

## Frontend Integration Examples

### TypeScript/Angular Service Example:

```typescript
@Injectable({
  providedIn: 'root'
})
export class PaymentsService {
  private apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  // Create payment structure
  createPaymentStructure(data: CreatePaymentStructureDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment-structures`, data);
  }

  // Get all payment structures
  getPaymentStructures(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/payment-structures`);
  }

  // Generate student payments
  generateStudentPayments(paymentStructureId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment-structures/${paymentStructureId}/generate-payments`, {});
  }

  // Get student payments with filters
  getStudentPayments(filters?: any): Observable<any[]> {
    const params = new HttpParams({ fromObject: filters || {} });
    return this.http.get<any[]>(`${this.apiUrl}/student-payments`, { params });
  }

  // Mark payment as paid
  markPaymentAsPaid(paymentId: string, paidAmount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/student-payments/${paymentId}/mark-paid`, { paidAmount });
  }

  // Get payment statistics
  getPaymentStatistics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/student-payments/statistics`);
  }
}
```

## Implementation Notes

### For Frontend Development:
1. **Payment Structure Management**: Create forms for defining payment structures with scope selection
2. **Student Payment Generation**: Provide bulk generation functionality with confirmation dialogs
3. **Payment Tracking**: Implement real-time status updates and filtering
4. **Payment Processing**: Create interfaces for marking payments as paid or waived
5. **Reporting**: Build dashboards for payment statistics and overdue payments

### For School Administrators:
1. **Payment Planning**: Create payment structures at the beginning of terms/sessions
2. **Student Assignment**: Generate student payments after creating payment structures
3. **Payment Monitoring**: Track payment status and follow up on overdue payments
4. **Financial Reporting**: Use statistics for financial planning and reporting

## API Versioning

- **Current Version**: v1
- **Base URL**: `http://localhost:8080`
- **Documentation**: Available at `/docs` (Swagger UI)

## Support

For technical support or questions about the Payments Management API:
- **Email**: support@schoolos.com
- **Documentation**: Available at `/docs`
- **Last Updated**: August 28, 2025
