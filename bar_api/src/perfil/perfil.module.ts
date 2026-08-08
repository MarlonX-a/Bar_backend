import { Module } from '@nestjs/common';
import { PerfilService } from './perfil.service';
import { PerfilController } from './perfil.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Perfil } from './entities/perfil.entity';
import { User } from '../users/entities/user.entity';
import { RolsModule } from '../rols/rols.module';
import { PermissionsGuard } from '../auth/authorization/permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Perfil, User]), RolsModule],
  controllers: [PerfilController],
  providers: [PerfilService, PermissionsGuard],
})
export class PerfilModule {}
