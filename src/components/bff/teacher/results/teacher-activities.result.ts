import { RecentActivity } from '../types';

export class TeacherActivitiesResult {
  activities: {
    id: string;
    type: 'attendance' | 'assessment' | 'class' | 'announcement';
    title: string;
    description: string;
    timestamp: string;
    classId?: string;
    subjectId?: string;
  }[];

  constructor(activities: RecentActivity[]) {
    this.activities = activities;
  }
}
