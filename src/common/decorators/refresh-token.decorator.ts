import { SetMetadata } from '@nestjs/common';

export const RefreshTokenDecoratorKey = 'isRefreshToken';

export const IsGuardedByRefreshToken = () => SetMetadata('isRefreshToken', true);
