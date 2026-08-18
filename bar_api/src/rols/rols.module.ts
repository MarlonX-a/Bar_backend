import { forwardRef, Module } from '@nestjs/common';
import { RolsService } from './rols.service';
import { RolsController } from './rols.controller';
import { Rol } from './entities/rol.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsGuard } from '../auth/authorization/permissions.guard';
import { Permission } from './entities/permission.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Rol, Permission]), forwardRef(() => AuditModule)],
  controllers: [RolsController],
  providers: [RolsService, PermissionsGuard],
  exports: [RolsService],
})
export class RolsModule {}
