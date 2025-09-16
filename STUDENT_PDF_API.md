# Student Results PDF Download API

## Overview

The Student Results PDF API provides functionality to download student academic results as a professionally formatted PDF document. The PDF includes school details, student information, academic results, and official signatures.

## Endpoint

### GET /api/student/results/pdf

**Description**: Download student academic results as PDF

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `academicSessionId` (optional): Academic session ID to filter results
- `termId` (optional): Term ID to filter results

**Response:**
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename="results_STUDENT_NO_TERM_NAME.pdf"`
- **Body**: PDF file binary data

## PDF Document Structure

### 1. Header Section
- **School Name**: "BRIGHT FUTURE HIGH SCHOOL" (centered, bold, large font)
- **School Motto**: "Excellence in Education"
- **School Address**: "Lagos, Nigeria"
- **Report Title**: "ACADEMIC REPORT CARD" (centered, bold)
- **Separator Line**: Horizontal line below header

### 2. Student Information Section
- **Student Name**: Full name of the student
- **Student Number**: Unique student identifier
- **Class**: Level and class arm (e.g., "JSS1 A")

### 3. Academic Information Section
- **Academic Session**: Current academic year (e.g., "2024/2025")
- **Term**: Current term name (e.g., "First Term")
- **Term Period**: Start and end dates of the term

### 4. Academic Results Table
Professional table with the following columns:
- **Subject**: Subject name
- **Test 1**: Score out of 20
- **Test 2**: Score out of 20
- **Exam**: Score out of 60
- **Total**: Total score out of 100
- **Grade**: Letter grade (A+, A, B, C, D, F)

**Table Features:**
- Alternating row colors for better readability
- Centered alignment for scores and grades
- Bold formatting for grades
- Professional borders and spacing

### 5. Overall Performance Section
- **Total Subjects**: Number of subjects taken
- **Total Score**: Sum of all subject scores
- **Average Score**: Average score across all subjects
- **Overall Grade**: Overall letter grade
- **Position in Class**: Student's position and total class size

### 6. Footer Section
**Signature Areas:**
- **Class Teacher**: Signature line with "Signature & Date"
- **Head of Department**: Signature line with "Signature & Date"
- **Principal**: Signature line with "Signature & Date"

**Remarks Section:**
- Standard remarks about student performance
- Encouragement for continued excellence

**Document Footer:**
- Generation date
- Separator line

## Example Usage

### Request
```http
GET /api/student/results/pdf?termId=term_123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response Headers
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="results_BFH_S_25_0001_First_Term.pdf"
Content-Length: 45678
```

### Response Body
Binary PDF data that will be downloaded as a file.

## PDF Features

### Professional Formatting
- **Font**: Helvetica family (Helvetica, Helvetica-Bold)
- **Page Size**: A4 (210 × 297 mm)
- **Margins**: 50pt on all sides
- **Colors**: Black text with light gray alternating rows

### Layout Structure
- **Header**: School branding and report title
- **Student Info**: Key student details
- **Academic Info**: Session and term details
- **Results Table**: Comprehensive subject performance
- **Statistics**: Overall performance metrics
- **Signatures**: Official approval areas
- **Footer**: Generation timestamp

### Data Accuracy
- Uses actual assessment structure maxScore values (20, 20, 60)
- Calculates grades based on total scores
- Includes real attendance and performance data
- Shows accurate academic session and term information

## Error Handling

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to generate PDF",
  "error": "Detailed error message"
}
```

**Common Error Scenarios:**
- Student not found
- Invalid academic session or term
- PDF generation failure
- Missing assessment data

## Security

- **Authentication Required**: JWT token must be valid
- **Student Access Only**: Students can only download their own results
- **Activity Logging**: All PDF downloads are logged for audit purposes

## Performance

- **Generation Time**: Typically 1-3 seconds
- **File Size**: Usually 50-100KB depending on number of subjects
- **Memory Usage**: Minimal, generates PDF in memory buffer

## Testing

### Test with Rahul Turner Data
Use the seeded data for Rahul Turner (ID: `71b1e6e1-049f-458a-a9ce-c219e118c392`) to test the PDF generation:

```http
GET /api/student/results/pdf
Authorization: Bearer <rahul_turner_jwt_token>
```

**Expected PDF Content:**
- Student: Rahul Turner (BFH/S/25/0001)
- Class: JSS1 A
- 9 subjects with realistic scores
- Overall Grade: A (89.4 average)
- Professional formatting with signatures

## Integration Notes

### Frontend Integration
```javascript
// Example frontend code to download PDF
const downloadPDF = async () => {
  try {
    const response = await fetch('/api/student/results/pdf', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my_results.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('PDF download failed:', error);
  }
};
```

### File Naming Convention
PDF files are automatically named using the pattern:
`results_{STUDENT_NO}_{TERM_NAME}.pdf`

Example: `results_BFH_S_25_0001_First_Term.pdf`

## Dependencies

- **pdfkit**: PDF generation library
- **@types/pdfkit**: TypeScript definitions
- **Express Response**: For file download handling

## Architecture

The PDF service is now located in the shared services directory (`src/shared/services/`) rather than within the BFF module, making it reusable across different parts of the application:

- **SharedServicesModule**: Provides the PdfService to any module that imports it
- **StudentModule**: Imports SharedServicesModule to access PdfService
- **Generic Interface**: Uses `StudentResultData` interface instead of BFF-specific types

## Future Enhancements

- Custom school branding and logos
- Multiple PDF templates
- Batch PDF generation
- Email PDF delivery
- Digital signatures
- QR codes for verification
