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
  subaccount?: string;
  transaction_charge?: number; // Platform's charge in kobo
}

export interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string;
  country: string;
  currency: string;
  type: string;
  active: boolean;
}

export interface PaystackResolvedAccount {
  account_number: string;
  account_name: string;
  bank_id: number;
}

export interface PaystackSubaccount {
  subaccount_code: string;
  business_name: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number;
  id: number;
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
      const payload: Record<string, any> = {
        amount: paymentRequest.amount,
        email: paymentRequest.email,
        reference: paymentRequest.reference,
        currency: paymentRequest.currency || 'NGN',
        metadata: paymentRequest.metadata,
        callback_url: paymentRequest.callback_url,
      };

      if (paymentRequest.subaccount) {
        payload.subaccount = paymentRequest.subaccount;
        payload.bearer = 'account'; // School (subaccount) bears nothing extra; platform gets transaction_charge
      }

      if (paymentRequest.transaction_charge !== undefined) {
        payload.transaction_charge = paymentRequest.transaction_charge;
      }

      const response = await this.paystackClient.post('/transaction/initialize', payload);

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
   * List Nigerian banks from Paystack
   */
  async listBanks(): Promise<PaystackBank[]> {
    try {
      const response = await this.paystackClient.get('/bank', {
        params: { country: 'nigeria', perPage: 100 },
      });
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to list banks: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to fetch bank list');
    }
  }

  /**
   * Resolve/verify a bank account number
   */
  async resolveAccountNumber(
    accountNumber: string,
    bankCode: string,
  ): Promise<PaystackResolvedAccount> {
    try {
      const response = await this.paystackClient.get('/bank/resolve', {
        params: { account_number: accountNumber, bank_code: bankCode },
      });
      if (!response.data.status) {
        throw new BadRequestException(response.data.message || 'Failed to resolve account');
      }
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to resolve account: ${error.message}`, error.stack);
      if (error.response?.data?.message) {
        throw new BadRequestException(error.response.data.message);
      }
      throw new BadRequestException('Failed to verify bank account');
    }
  }

  /**
   * Create a Paystack subaccount for a school
   */
  async createSubaccount(
    businessName: string,
    bankCode: string,
    accountNumber: string,
    percentageCharge: number = 0,
  ): Promise<PaystackSubaccount> {
    try {
      const response = await this.paystackClient.post('/subaccount', {
        business_name: businessName,
        settlement_bank: bankCode,
        account_number: accountNumber,
        percentage_charge: percentageCharge,
      });
      if (!response.data.status) {
        throw new BadRequestException(response.data.message || 'Failed to create subaccount');
      }
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to create subaccount: ${error.message}`, error.stack);
      if (error.response?.data?.message) {
        throw new BadRequestException(error.response.data.message);
      }
      throw new BadRequestException('Failed to create subaccount');
    }
  }

  /**
   * Update an existing Paystack subaccount
   */
  async updateSubaccount(
    subaccountCode: string,
    data: { business_name?: string; settlement_bank?: string; account_number?: string },
  ): Promise<PaystackSubaccount> {
    try {
      const response = await this.paystackClient.put(`/subaccount/${subaccountCode}`, data);
      if (!response.data.status) {
        throw new BadRequestException(response.data.message || 'Failed to update subaccount');
      }
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to update subaccount: ${error.message}`, error.stack);
      if (error.response?.data?.message) {
        throw new BadRequestException(error.response.data.message);
      }
      throw new BadRequestException('Failed to update subaccount');
    }
  }

}
