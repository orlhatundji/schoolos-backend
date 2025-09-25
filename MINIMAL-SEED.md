# Minimal Seed Script

This script creates a minimal setup with just one school and one admin account for development/testing purposes.

## What it creates:

- **1 School**: Bright Future High School
- **1 Super Admin**: admin@brightfuture.edu
- **1 Academic Session**: 2024/2025 (current)
- **1 Academic Term**: First Term (current)

## Usage:

```bash
# Reset database and run minimal seed
npm run db-reset
npm run db-seed-minimal

# Or run just the minimal seed (if database is already set up)
npm run db-seed-minimal
```

## Login Credentials:

- **Email**: admin@brightfuture.edu
- **Password**: Password@123
- **Role**: SUPER_ADMIN

## Benefits:

- ✅ **Fast Setup**: Creates only essential data
- ✅ **No Bulk Data**: No students, teachers, or complex data
- ✅ **Clean State**: Perfect for testing new features
- ✅ **Assessment Structures**: Automatically created for the academic session
- ✅ **Ready to Use**: Can immediately login and start using the system

## Notes:

- Assessment structures and templates are automatically created when the academic session is created
- The system will use hardcoded defaults (Test 1, Test 2, Exam) since no global default template exists
- Perfect for development, testing, and demonstrations
