import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { BaseService } from '../../common/base-service';
import { UsersService } from '../users/users.service';
import { StudentMessages } from './results';
import { StudentsRepository } from './students.repository';
import { Student } from './types';
import { SchoolsService } from '../schools';
import { getNextUserEntityNoFormatted } from '../../utils/misc';
import { CounterService } from '../../common/counter';
import { UserTypes } from '../users/constants';

@Injectable()
export class StudentsService extends BaseService {
  constructor(
    private readonly userService: UsersService,
    private readonly studentsRepository: StudentsRepository,
    private readonly schoolsService: SchoolsService,
    private readonly counterService: CounterService,
  ) {
    super(StudentsService.name);
  }

  async create(createStudentDto: CreateStudentDto): Promise<Student> {
    if (createStudentDto.admissionNo) {
      await this.throwIfStudentAdmissionNoExists(createStudentDto.admissionNo);
    }

    return this.save(createStudentDto);
  }

  private async throwIfStudentAdmissionNoExists(admissionNo: string) {
    const existingStudent = await this.studentsRepository.findOne({
      where: { admissionNo },
    });

    if (existingStudent) {
      throw new BadRequestException(StudentMessages.FAILURE.STUDENT_ADMISSION_NO_EXISTS);
    }
  }

  private async save(createStudentDto: CreateStudentDto): Promise<Student> {
    const { classArmId, guardianId, admissionDate, admissionNo, ...others } = createStudentDto;

    const user = await this.userService.save(others);
    const school = await this.schoolsService.getSchoolById(user.schoolId);
    const dateTime = admissionDate || new Date();

    const nextSeq = await this.counterService.getNextSequenceNo(UserTypes.STUDENT, school.id);
    const studentNo = getNextUserEntityNoFormatted(
      UserTypes.STUDENT,
      school.code,
      dateTime,
      nextSeq,
    );

    const studentData = {
      userId: user.id,
      studentNo,
      classArmId,
      guardianId,
      admissionNo,
      admissionDate: dateTime,
    };

    const student = await this.studentsRepository.create(studentData, {
      include: { user: true },
    });

    return student;
  }

  getStudentByStudentNo(studentNo: string): Promise<Student> {
    return this.studentsRepository.findOneByStudentNo(studentNo);
  }

  findAll() {
    return this.studentsRepository.findAll();
  }

  findOne(id: string) {
    return this.studentsRepository.findById(id);
  }

  update(id: string, updateStudentDto: UpdateStudentDto) {
    return this.studentsRepository.update({ id }, updateStudentDto);
  }

  remove(id: string) {
    return this.studentsRepository.delete({ id });
  }
}
