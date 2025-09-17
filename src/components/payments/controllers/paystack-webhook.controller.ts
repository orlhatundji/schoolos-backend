import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  RawBody,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';

import { PaystackWebhookService } from '../services/paystack-webhook.service';
import { PaystackWebhookEventDto, WebhookResponseDto } from '../dto/paystack-webhook.dto';
import { Public } from '../../../common/decorators';

@Controller('webhooks/paystack')
@ApiTags('Paystack Webhooks')
@Public()
@SkipThrottle()
export class PaystackWebhookController {
  private readonly logger = new Logger(PaystackWebhookController.name);

  constructor(
    private readonly webhookService: PaystackWebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Paystack webhook events',
    description: 'Receives and processes webhook events from Paystack for payment notifications',
  })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'Paystack webhook signature for verification',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook data or processing failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid webhook signature',
  })
  async handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @RawBody() rawBody: Buffer,
  ): Promise<WebhookResponseDto> {
    if (!signature || !rawBody) {
      throw new BadRequestException('Webhook request missing signature or body');
    }

    const isValid = this.webhookService.verifySignature(rawBody, signature);

    if (!isValid) {
      this.logger.error('Invalid Paystack webhook signature');
      throw new UnauthorizedException('Invalid Paystack webhook signature');
    }

    try {
      const event = JSON.parse(rawBody.toString('utf8')) as PaystackWebhookEventDto;

      if (!event || !event.event) {
        this.logger.error('Webhook event field is missing or undefined after parsing');
        throw new BadRequestException('Malformed webhook event data');
      }

      const result = await this.webhookService.handleWebhookEvent(event);

      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test webhook endpoint',
    description: 'Test endpoint for webhook functionality (development only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Test webhook processed successfully',
  })
  async testWebhook(@Body() testData: any): Promise<WebhookResponseDto> {
    try {
      // Create a mock webhook event for testing
      const mockWebhookEvent: PaystackWebhookEventDto = {
        event: 'charge.success',
        data: {
          id: 123456789,
          domain: 'test',
          status: 'success',
          reference: testData.reference || 'test_reference_123',
          amount: testData.amount || 5000000, // 50,000 NGN in kobo
          message: 'Successful',
          gateway_response: 'Successful',
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          channel: 'card',
          currency: 'NGN',
          ip_address: '127.0.0.1',
          metadata: testData.metadata || {},
          fees: 0,
          requested_amount: testData.amount || 5000000,
        },
      };

      const result = await this.webhookService.handleWebhookEvent(mockWebhookEvent);

      return {
        success: result.success,
        message: `Test webhook: ${result.message}`,
      };
    } catch (error) {
      this.logger.error(`Test webhook failed: ${error.message}`, error.stack);
      throw new BadRequestException('Test webhook failed');
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Webhook health check' })
  @ApiResponse({
    status: 200,
    description: 'Webhook endpoint is healthy',
  })
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
