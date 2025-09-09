import { UpcomingEvent } from '../types';

export class TeacherEventsResult {
  events: {
    id: string;
    type: 'class' | 'assessment' | 'meeting' | 'deadline';
    title: string;
    description: string;
    date: string;
    time: string;
    location?: string;
    classId?: string;
    subjectId?: string;
    priority: 'low' | 'medium' | 'high';
  }[];

  constructor(events: UpcomingEvent[]) {
    this.events = events;
  }
}
