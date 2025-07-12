/**
 * This method fetches the name of the correct environment file
 * this depends on the environment Node.js is currently running in
 * @returns the name of the environment file e.g .env, .env.development, .env.test
 */
export function getEnvFileName(): string {
  const ENV = process.env.NODE_ENV;

  if (isProductionOrNotSet(ENV)) {
    return '.env';
  }

  return `.env.${ENV}`.trim();
}

function isProductionOrNotSet(ENV: string): boolean {
  return !ENV || ['prod', 'production'].includes(ENV);
}
