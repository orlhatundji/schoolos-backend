import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Paystack is unreachable or returned a 5xx — retryable from the caller's
 * perspective. The original failure is captured via `upstreamCause` for logging,
 * NOT exposed to the API consumer.
 */
export class PaystackUnavailableError extends HttpException {
  readonly upstreamCause?: unknown;

  constructor(message: string, upstreamCause?: unknown) {
    super({ statusCode: HttpStatus.BAD_GATEWAY, message }, HttpStatus.BAD_GATEWAY);
    this.upstreamCause = upstreamCause;
  }
}

/**
 * Paystack returned a 4xx. The original Paystack message is captured for
 * server-side logging but NOT propagated to the API consumer.
 */
export class PaystackClientError extends HttpException {
  readonly upstreamStatus: number;
  readonly paystackMessage?: string;

  constructor(message: string, upstreamStatus: number, paystackMessage?: string) {
    super({ statusCode: HttpStatus.BAD_REQUEST, message }, HttpStatus.BAD_REQUEST);
    this.upstreamStatus = upstreamStatus;
    this.paystackMessage = paystackMessage;
  }
}
