export interface StudentDashboardData {
  student: {
    id: string;
    studentNo: string;
    fullName: string;
    avatarUrl?: string;
    classArm: {
      id: string;
      name: string;
      level: {
        id: string;
        name: string;
      };
    };
  };
  academicInfo: {
    currentSession: {
      id: string;
      academicYear: string;
      isCurrent: boolean;
    };
    currentTerm: {
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
    };
  };
  statistics: {
    totalSubjects: number;
    averageScore: number;
    attendanceRate: number;
    totalAssessments: number;
  };
  recentActivities: {
    id: string;
    type: 'ASSESSMENT' | 'ATTENDANCE' | 'RESULT';
    title: string;
    description: string;
    date: Date;
    subjectName?: string;
  }[];
  upcomingEvents: {
    id: string;
    title: string;
    description: string;
    date: Date;
    type: 'EXAM' | 'ASSIGNMENT' | 'EVENT';
  }[];
}

export interface StudentResultsData {
  student: {
    id: string;
    studentNo: string;
    fullName: string;
    classArm: {
      id: string;
      name: string;
      level: {
        id: string;
        name: string;
      };
    };
  };
  academicSession: {
    id: string;
    academicYear: string;
    isCurrent: boolean;
  };
  term: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };
  subjects: {
    id: string;
    name: string;
    code: string;
    totalScore: number;
    averageScore: number;
    grade?: string;
    assessments: {
      id: string;
      name: string;
      score: number;
      maxScore: number;
      isExam: boolean;
      date: Date;
    }[];
  }[];
  overallStats: {
    totalSubjects: number;
    totalScore: number;
    averageScore: number;
    position?: number;
    totalStudents: number;
    grade?: string;
  };
}

export interface StudentProfileData {
  student: {
    id: string;
    studentNo: string;
    admissionNo?: string;
    admissionDate: Date;
    status: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    gender: string;
    dateOfBirth?: Date;
    avatarUrl?: string;
  };
  classArm: {
    id: string;
    name: string;
    level: {
      id: string;
      name: string;
    };
  };
  guardian?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    relationship: string;
  };
}

export interface StudentAttendanceData {
  student: {
    id: string;
    studentNo: string;
    fullName: string;
  };
  attendance: {
    date: Date;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    subjectName?: string;
    remarks?: string;
  }[];
  statistics: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    excusedDays: number;
    attendanceRate: number;
  };
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface StudentSubjectData {
  id: string;
  name: string;
  code: string;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
  };
  academicSession: {
    id: string;
    academicYear: string;
  };
  term: {
    id: string;
    name: string;
  };
  enrollmentDate: Date;
  currentScore?: number;
  averageScore?: number;
  grade?: string;
  totalAssessments: number;
  completedAssessments: number;
}
