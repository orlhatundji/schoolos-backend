import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class PaystackAuthorizationDto {
  @ApiProperty()
  @IsString()
  authorization_code: string;

  @ApiProperty()
  @IsString()
  bin: string;

  @ApiProperty()
  @IsString()
  last4: string;

  @ApiProperty()
  @IsString()
  exp_month: string;

  @ApiProperty()
  @IsString()
  exp_year: string;

  @ApiProperty()
  @IsString()
  channel: string;

  @ApiProperty()
  @IsString()
  card_type: string;

  @ApiProperty()
  @IsString()
  bank: string;

  @ApiProperty()
  @IsString()
  country_code: string;

  @ApiProperty()
  @IsString()
  brand: string;

  @ApiProperty()
  @IsBoolean()
  reusable: boolean;

  @ApiProperty()
  @IsString()
  signature: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  account_name?: string;
}

export class PaystackCustomerDto {
  @ApiProperty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsString()
  first_name: string;

  @ApiProperty()
  @IsString()
  last_name: string;

  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  customer_code: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty()
  @IsString()
  risk_action: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  international_format_phone?: string;
}

export class PaystackWebhookDataDto {
  @ApiProperty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsString()
  domain: string;

  @ApiProperty()
  @IsString()
  status: string;

  @ApiProperty()
  @IsString()
  reference: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty()
  @IsString()
  gateway_response: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  paid_at?: string;

  @ApiProperty()
  @IsString()
  created_at: string;

  @ApiProperty()
  @IsString()
  channel: string;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiProperty()
  @IsString()
  ip_address: string;

  @ApiProperty()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty()
  @IsNumber()
  fees: number;

  @ApiProperty()
  @IsObject()
  @IsOptional()
  authorization?: PaystackAuthorizationDto;

  @ApiProperty()
  @IsObject()
  @IsOptional()
  customer?: PaystackCustomerDto;

  @ApiProperty()
  @IsNumber()
  requested_amount: number;
}

export class PaystackWebhookEventDto {
  @ApiProperty()
  @IsString()
  event: string;

  @ApiProperty()
  @IsObject()
  data: PaystackWebhookDataDto;
}

export class WebhookResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;
}