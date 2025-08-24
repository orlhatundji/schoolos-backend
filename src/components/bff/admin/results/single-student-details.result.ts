import { ApiProperty } from '@nestjs/swagger';

import { SingleStudentDetails } from '../types';

export class SingleStudentDetailsResult {
  @ApiProperty({ example: 'st_12345' })
  id: string;

  @ApiProperty({ example: 'Amaya Kemmer' })
  name: string;

  @ApiProperty({ example: 'xvjwidj' })
  studentId: string;

  @ApiProperty({ example: 'ADM/2024/001' })
  admissionNumber: string;

  @ApiProperty({ example: 'Male' })
  gender: string;

  @ApiProperty({ example: 15 })
  age: number;

  @ApiProperty({ example: 'Delta' })
  stateOfOrigin: string;

  @ApiProperty({ example: 'Ramon Hintz' })
  guardianName: string;

  @ApiProperty({ example: '+1487399867', nullable: true })
  guardianPhone: string | null;

  @ApiProperty({ example: '+1487399867', nullable: true })
  telephone: string | null;

  @ApiProperty({ example: 'JSS 2B' })
  className: string;

  @ApiProperty({ example: 'JSS 2' })
  classLevel: string;

  @ApiProperty({ example: 85.5 })
  averageGrade: number;

  @ApiProperty({ example: true })
  isPresent: boolean;

  @ApiProperty({ example: 93.2 })
  attendanceRate: number;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', nullable: true })
  avatarUrl: string | null;

  constructor(data: SingleStudentDetails) {
    this.id = data.id;
    this.name = data.name;
    this.studentId = data.studentId;
    this.admissionNumber = data.admissionNumber;
    this.gender = data.gender;
    this.age = data.age;
    this.stateOfOrigin = data.stateOfOrigin;
    this.guardianName = data.guardianName;
    this.guardianPhone = data.guardianPhone;
    this.telephone = data.telephone;
    this.className = data.className;
    this.classLevel = data.classLevel;
    this.averageGrade = data.averageGrade;
    this.isPresent = data.isPresent;
    this.attendanceRate = data.attendanceRate;
    this.avatarUrl = data.avatarUrl;
  }
}
