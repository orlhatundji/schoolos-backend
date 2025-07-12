import * as Joi from 'joi';

export const ConfigValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'prod', 'test'),
  PORT: Joi.number().default(3000),

  JWT_EXPIRES_IN: Joi.string().default('15m'),
  REFRESH_TOKEN_AGE: Joi.string().default('7d'),
  JWT_SECRET: Joi.string().required(),

  DATABASE_URL: Joi.string().required(),

  REFRESH_TOKEN_SECRET: Joi.string().required(),

  ENCRYPTOR_SECRET_KEY: Joi.string().required(),
  THROTTLER_TTL: Joi.number().default(60), // 1 minute
  THROTTLER_LIMIT: Joi.number().default(50), // 50 requests

  RESEND_API_KEY: Joi.string().required(),
  MAILJET_API_KEY: Joi.string().required(),
  MAILJET_SECRET_KEY: Joi.string().required(),

  DEFAULT_SOURCE_EMAIL: Joi.string().required(),
  OTP_GENERATOR_KEY: Joi.string().required(),
});
