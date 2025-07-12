import { SetMetadata } from '@nestjs/common';

export const PublicDecoratorKey = 'isPublic';
export const Public = () => SetMetadata(PublicDecoratorKey, true);
