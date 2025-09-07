import { SchoolSignupRequest } from '@prisma/client';

export type SchoolSignupRequestWithReviewer = SchoolSignupRequest & {
  reviewer?: {
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
};

export interface ContactPerson {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface SchoolAddress {
  country: string;
  state: string;
  city: string;
  street1: string;
  street2?: string;
  zip?: string;
}

export interface SchoolDetails {
  type: 'PRIMARY' | 'SECONDARY' | 'MIXED';
  capacity?: number;
  website?: string;
  description?: string;
}

export interface CreateSchoolSignupDto {
  schoolName: string;
  schoolCode: string;
  contactPerson: ContactPerson;
  address: SchoolAddress;
  schoolDetails: SchoolDetails;
}

export interface UpdateSchoolSignupStatusDto {
  action: 'approve' | 'reject';
  notes?: string;
  rejectionReason?: string;
}
