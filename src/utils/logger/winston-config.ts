import * as winston from 'winston';
const { format } = winston;

const winstonOptions = {
  file: {
    format: format.combine(format.splat(), format.json(), format.timestamp()),
    filename: 'logs/combined.log',
  },
};

export { winstonOptions };
