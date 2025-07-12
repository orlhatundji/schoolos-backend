import { IJwtPayload } from './jwt-payload.interface';

export type JwtPayloadWithRt = IJwtPayload & { refreshToken: string };
