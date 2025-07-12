import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class BaseResult {
  @ApiProperty()
  public status: HttpStatus;

  @ApiProperty()
  public message: string;

  @ApiProperty()
  public totalDocuments?: number;

  @ApiProperty()
  public totalPages: number;

  @ApiProperty()
  public currentPage: number;

  @ApiProperty()
  public limit: number;

  constructor(
    status: HttpStatus,
    message: string,
    totalDocuments?: number,
    limit?: number,
    currentPage?: number,
  ) {
    this.status = status;
    this.message = message;
    this.totalDocuments = totalDocuments;
    this.limit = limit;
    this.currentPage = currentPage;
    if (totalDocuments && limit) {
      this.totalPages = Math.ceil(totalDocuments / limit);
    }
  }
}

export interface ResultOptions {
  message: string;
  status: HttpStatus;
}
