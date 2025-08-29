import { PartialType } from '@nestjs/swagger';
import { CreatePaymentStructureDto } from './create-payment-structure.dto';

export class UpdatePaymentStructureDto extends PartialType(CreatePaymentStructureDto) {}
