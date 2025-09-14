import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { BaseResultWithData } from '../../../common/results';
import { BulkUploadResultDto } from '../dto/bulk-upload-result.dto';

export class BulkUploadResult extends BaseResultWithData<BulkUploadResultDto> {
  @ApiProperty({ type: () => BulkUploadResultDto })
  public data: BulkUploadResultDto;

  public static from(
    result: BulkUploadResultDto,
    options: { message: string; status: HttpStatus },
  ): BulkUploadResult {
    return new BulkUploadResult(options.status, options.message, result);
  }
}
