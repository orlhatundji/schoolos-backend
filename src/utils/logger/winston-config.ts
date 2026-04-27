import * as dotenv from 'dotenv';
import * as winston from 'winston';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LokiTransport = require('winston-loki');
const { format } = winston;

function getLokiTransports(): winston.transport[] {
  // Ensure env vars are loaded regardless of import order
  dotenv.config();

  const transports: winston.transport[] = [];

  if (process.env.GRAFANA_LOKI_HOST) {
    transports.push(
      new LokiTransport({
        host: process.env.GRAFANA_LOKI_HOST,
        basicAuth: `${process.env.GRAFANA_LOKI_USERNAME}:${process.env.GRAFANA_LOKI_PASSWORD}`,
        labels: {
          app: 'schoolos-backend',
          environment: process.env.NODE_ENV || 'development',
        },
        json: true,
        batching: false,
        replaceTimestamp: true,
        onConnectionError: (err) => console.error('Loki connection error:', err),
      }),
    );
  }

  return transports;
}

const winstonOptions = {
  file: {
    filename: 'logs/combined.log',
  },
  getLokiTransports,
};

export { winstonOptions };
