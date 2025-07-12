import { Module } from '@nestjs/common';
import { RoleManagerFactory } from './role-manager.factory';

@Module({
  providers: [RoleManagerFactory],
  exports: [RoleManagerFactory],
})
export class RolesManagerModule {}
