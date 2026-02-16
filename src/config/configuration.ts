const getConfiguration = () => ({
  port: parseInt(process.env.PORT, 10) || 8080,
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshTokenAge: process.env.REFRESH_TOKEN_AGE,
  },
  encryptor: {
    key: process.env.ENCRYPTOR_SECRET_KEY,
  },
  throttler: {
    ttl: process.env.THROTTLER_TTL,
    limit: process.env.THROTTLER_LIMIT,
  },
  mail: {
    resendApiKey: process.env.RESEND_API_KEY,
    mailjetApiKey: process.env.MAILJET_API_KEY,
    mailjetSecretKey: process.env.MAILJET_SECRET_KEY,
    defaultEmail: process.env.DEFAULT_SOURCE_EMAIL,
  },
  platformAdmin: {
    email: process.env.PLATFORM_ADMIN_EMAIL || 'orlhatundji@gmail.com',
    password: process.env.PLATFORM_ADMIN_PASSWORD || 'Password@123',
    firstName: process.env.PLATFORM_ADMIN_FIRST_NAME || 'Platform',
    lastName: process.env.PLATFORM_ADMIN_LAST_NAME || 'Admin',
  },
  frontendBaseUrl: process.env.FRONTEND_BASE_URL,
  adminAppBaseUrl: process.env.ADMIN_APP_BASE_URL,
  teacherAppBaseUrl: process.env.TEACHER_APP_BASE_URL,
  studentAppBaseUrl: process.env.STUDENT_APP_BASE_URL,
  platformAppBaseUrl: process.env.PLATFORM_APP_BASE_URL,
  websiteBaseUrl: process.env.WEBSITE_BASE_URL,
  otpGeneratorKey: process.env.OTP_GENERATOR_KEY,
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY,
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
  },
  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3Bucket: process.env.AWS_S3_BUCKET,
    s3Endpoint: process.env.AWS_S3_ENDPOINT,
    s3Folder: process.env.AWS_S3_FOLDER,
  },
});

export default getConfiguration;
