import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../entities/user.entity';
import { Program } from '../../entities/program.entity';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  // RBAC in this application is the static, enum-driven ROLE_PERMISSIONS
  // map in `common/rbac/rbac.config.ts`, enforced by RolesGuard/
  // PermissionsGuard on every controller. A previously-scaffolded
  // relational Role/Permission schema (many-to-many join tables intended
  // for future runtime-configurable roles) was never wired into any guard
  // or service and has been removed — see docs/adr/0001-rbac-model.md.
  imports: [TypeOrmModule.forFeature([User, Program]), ActivityLogsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

