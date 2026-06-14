import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';

import { PaystackClientError, PaystackUnavailableError } from './errors';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

export interface PaystackPaymentRequest {
  amount: number;
  email: string;
  reference: string;
  currency?: string;
  metadata?: Record<string, unknown>;
  callback_url?: string;
  subaccount?: string;
  transaction_charge?: number;
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
    metadata: Record<string, unknown>;
    fees: number;
    requested_amount: number;
    customer?: { email: string; first_name?: string; last_name?: string };
    authorization?: Record<string, unknown>;
  };
}

@Injectable()
export class PaystackApiClient {
  private readonly logger = new Logger(PaystackApiClient.name);
  private readonly client: AxiosInstance;
  private readonly publicKey: string;

  constructor(configService: ConfigService) {
    const secretKey = configService.get<string>('paystack.secretKey');
    const publicKey = configService.get<string>('paystack.publicKey');
    if (!secretKey || !publicKey) {
      throw new Error('Paystack keys are not configured');
    }
    this.publicKey = publicKey;

    this.client = axios.create({
      baseURL: PAYSTACK_BASE_URL,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: REQUEST_TIMEOUT_MS,
    });
  }

  async initializePayment(request: PaystackPaymentRequest): Promise<PaystackPaymentResponse> {
    const payload: Record<string, unknown> = {
      amount: request.amount,
      email: request.email,
      reference: request.reference,
      currency: request.currency ?? 'NGN',
      metadata: request.metadata,
      callback_url: request.callback_url,
    };
    if (request.subaccount) {
      payload.subaccount = request.subaccount;
      payload.bearer = 'subaccount';
    }
    if (request.transaction_charge !== undefined) {
      payload.transaction_charge = request.transaction_charge;
    }

    return this.call<PaystackPaymentResponse>(
      () => this.client.post('/transaction/initialize', payload),
      'initializePayment',
    );
  }

  async verifyPayment(reference: string): Promise<PaystackVerificationResponse> {
    return this.call<PaystackVerificationResponse>(
      () => this.client.get(`/transaction/verify/${reference}`),
      'verifyPayment',
    );
  }

  async listBanks(): Promise<PaystackBank[]> {
    const response = await this.call<PaystackEnvelope<PaystackBank[]>>(
      () => this.client.get('/bank', { params: { country: 'nigeria', perPage: 100 } }),
      'listBanks',
    );
    return response.data;
  }

  async resolveAccountNumber(
    accountNumber: string,
    bankCode: string,
  ): Promise<PaystackResolvedAccount> {
    const response = await this.call<PaystackEnvelope<PaystackResolvedAccount>>(
      () =>
        this.client.get('/bank/resolve', {
          params: { account_number: accountNumber, bank_code: bankCode },
        }),
      'resolveAccountNumber',
    );
    return response.data;
  }

  async createSubaccount(
    businessName: string,
    bankCode: string,
    accountNumber: string,
    percentageCharge: number = 0,
    contactInfo?: { email: string; name?: string; phone?: string },
  ): Promise<PaystackSubaccount> {
    const payload: Record<string, unknown> = {
      business_name: businessName,
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: percentageCharge,
    };
    if (contactInfo?.email) payload.primary_contact_email = contactInfo.email;
    if (contactInfo?.name) payload.primary_contact_name = contactInfo.name;
    if (contactInfo?.phone) payload.primary_contact_phone = contactInfo.phone;

    const response = await this.call<PaystackEnvelope<PaystackSubaccount>>(
      () => this.client.post('/subaccount', payload),
      'createSubaccount',
    );
    return response.data;
  }

  async updateSubaccount(
    subaccountCode: string,
    data: { business_name?: string; settlement_bank?: string; account_number?: string },
  ): Promise<PaystackSubaccount> {
    const response = await this.call<PaystackEnvelope<PaystackSubaccount>>(
      () => this.client.put(`/subaccount/${subaccountCode}`, data),
      'updateSubaccount',
    );
    return response.data;
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  convertToKobo(amountNaira: number): number {
    return Math.round(amountNaira * 100);
  }

  convertFromKobo(amountKobo: number): number {
    return amountKobo / 100;
  }

  generateReference(prefix: string = 'PAY'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  private async call<T extends { status: boolean; message?: string }>(
    op: () => Promise<{ data: T }>,
    opName: string,
  ): Promise<T> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await op();
        if (!response.data.status) {
          throw new PaystackClientError(
            `Paystack ${opName} returned status=false`,
            400,
            response.data.message,
          );
        }
        return response.data;
      } catch (error) {
        const mapped = this.classify(error, opName);
        if (mapped instanceof PaystackUnavailableError && attempt < MAX_RETRIES) {
          await this.sleep(2 ** (attempt - 1) * 250);
          continue;
        }
        throw mapped;
      }
    }
    throw new PaystackUnavailableError(`Paystack ${opName} failed after ${MAX_RETRIES} attempts`);
  }

  private classify(error: unknown, opName: string): PaystackClientError | PaystackUnavailableError {
    if (error instanceof PaystackClientError || error instanceof PaystackUnavailableError) {
      return error;
    }
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const status = axiosError.response?.status;
      const paystackMsg = axiosError.response?.data?.message;
      if (status && status >= 400 && status < 500) {
        this.logger.warn(`Paystack ${opName} client error ${status}: ${paystackMsg ?? axiosError.message}`);
        return new PaystackClientError(`Paystack ${opName} rejected request`, status, paystackMsg);
      }
      this.logger.error(`Paystack ${opName} transient failure: ${axiosError.message}`);
      return new PaystackUnavailableError(`Paystack ${opName} is unavailable`, error);
    }
    this.logger.error(`Paystack ${opName} unknown error: ${(error as Error).message}`);
    return new PaystackUnavailableError(`Paystack ${opName} failed`, error);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
