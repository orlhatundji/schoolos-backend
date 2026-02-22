import { ApiProperty } from '@nestjs/swagger';
import { BaseResultWithData, ResultOptions } from '../../../../common/results';
import { SchoolSignupRequestWithReviewer } from '../types';

export class SchoolSignupRequestEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  schoolName: string;

  @ApiProperty()
  schoolCode: string;

  @ApiProperty()
  contactPerson: any;

  @ApiProperty()
  address: any;

  @ApiProperty()
  schoolDetails: any;

  @ApiProperty()
  status: string;

  @ApiProperty()
  submittedAt: Date;

  @ApiProperty()
  reviewedAt?: Date;

  @ApiProperty()
  reviewerId?: string;

  @ApiProperty()
  notes?: string;

  @ApiProperty()
  rejectionReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  public static from(signupRequest: SchoolSignupRequestWithReviewer): SchoolSignupRequestEntity {
    const entity = new SchoolSignupRequestEntity();
    entity.id = signupRequest.id;
    entity.schoolName = signupRequest.schoolName;
    entity.schoolCode = signupRequest.schoolCode;
    entity.contactPerson = signupRequest.contactPerson;
    entity.address = signupRequest.address;
    entity.schoolDetails = signupRequest.schoolDetails;
    entity.status = signupRequest.status;
    entity.submittedAt = signupRequest.submittedAt;
    entity.reviewedAt = signupRequest.reviewedAt;
    entity.reviewerId = signupRequest.reviewerId;
    entity.notes = signupRequest.notes;
    entity.rejectionReason = signupRequest.rejectionReason;
    entity.createdAt = signupRequest.createdAt;
    entity.updatedAt = signupRequest.updatedAt;

    return entity;
  }
}

export class SchoolSignupResult extends BaseResultWithData<SchoolSignupRequestEntity> {
  @ApiProperty({ type: () => SchoolSignupRequestEntity })
  public data: SchoolSignupRequestEntity;

  public static from(
    signupRequest: SchoolSignupRequestWithReviewer,
    options: ResultOptions,
  ): SchoolSignupResult {
    const entity = SchoolSignupRequestEntity.from(signupRequest);
    return new SchoolSignupResult(options.status, options.message, entity);
  }
}
