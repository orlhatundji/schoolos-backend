import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface PaystackPaymentRequest {
  amount: number; // Amount in kobo (smallest currency unit)
  email: string;
  reference: string;
  currency?: string;
  metadata?: Record<string, any>;
  callback_url?: string;
}

export interface PaystackPaymentResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerificationResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, any>;
    log: any;
    fees: number;
    fees_split: any;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string;
    };
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
      metadata: any;
      risk_action: string;
      international_format_phone: string;
    };
    plan: any;
    split: any;
    order_id: any;
    paidAt: string;
    createdAt: string;
    requested_amount: number;
    pos_transaction_data: any;
    source: any;
    fees_breakdown: any;
  };
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly paystackClient: AxiosInstance;
  private readonly secretKey: string;
  private readonly publicKey: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('paystack.secretKey');
    this.publicKey = this.configService.get<string>('paystack.publicKey');

    if (!this.secretKey || !this.publicKey) {
      throw new Error('Paystack keys are not configured');
    }

    this.paystackClient = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Initialize a payment transaction
   */
  async initializePayment(
    paymentRequest: PaystackPaymentRequest,
  ): Promise<PaystackPaymentResponse> {
    try {
      const response = await this.paystackClient.post('/transaction/initialize', {
        amount: paymentRequest.amount,
        email: paymentRequest.email,
        reference: paymentRequest.reference,
        currency: paymentRequest.currency || 'NGN',
        metadata: paymentRequest.metadata,
        callback_url: paymentRequest.callback_url,
      });

      if (!response.data.status) {
        throw new BadRequestException(response.data.message || 'Failed to initialize payment');
      }

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to initialize payment: ${error.message}`, error.stack);
      if (error.response?.data?.message) {
        throw new BadRequestException(error.response.data.message);
      }
      throw new BadRequestException('Failed to initialize payment');
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(reference: string): Promise<PaystackVerificationResponse> {
    try {
      const response = await this.paystackClient.get(`/transaction/verify/${reference}`);

      if (!response.data.status) {
        throw new BadRequestException(response.data.message || 'Failed to verify payment');
      }

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to verify payment: ${error.message}`, error.stack);
      if (error.response?.data?.message) {
        throw new BadRequestException(error.response.data.message);
      }
      throw new BadRequestException('Failed to verify payment');
    }
  }

  /**
   * Get payment details by reference
   */
  async getPaymentDetails(reference: string): Promise<PaystackVerificationResponse> {
    try {
      const response = await this.paystackClient.get(`/transaction/verify/${reference}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get payment details: ${error.message}`, error.stack);
      if (error.response?.data?.message) {
        throw new BadRequestException(error.response.data.message);
      }
      throw new BadRequestException('Failed to get payment details');
    }
  }

  /**
   * Convert amount to kobo (Paystack's smallest currency unit)
   */
  convertToKobo(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert amount from kobo to naira
   */
  convertFromKobo(amount: number): number {
    return amount / 100;
  }

  /**
   * Generate a unique reference for payment
   */
  generateReference(prefix: string = 'PAY'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const hash = crypto.createHmac('sha512', secret).update(payload, 'utf8').digest('hex');
      return hash === signature;
    } catch (error) {
      this.logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Get webhook events (for debugging)
   */
  async getWebhookEvents(): Promise<any> {
    try {
      const response = await this.paystackClient.get('/webhook');
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get webhook events: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get webhook events');
    }
  }

  /**
   * Create webhook endpoint
   */
  async createWebhook(url: string, events: string[]): Promise<any> {
    try {
      const response = await this.paystackClient.post('/webhook', {
        url,
        events,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create webhook: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create webhook');
    }
  }
}
