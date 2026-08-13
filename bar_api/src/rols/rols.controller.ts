import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { PermissionsGuard } from '../auth/authorization/permissions.guard';
import { RequirePermissions } from '../auth/authorization/permissions.decorator';
import { PermissionCode } from './permission.constants';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto';
import { RolsService } from './rols.service';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('rols')
export class RolsController {
  constructor(private readonly rolsService: RolsService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.ROLE_MANAGE)
  @Post()
  create(
    @Body() createRolDto: CreateRolDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.rolsService.create(createRolDto, req.user.idUser);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.ROLE_MANAGE)
  @Get()
  findAll() {
    return this.rolsService.findAll();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.ROLE_MANAGE)
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.rolsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.ROLE_MANAGE)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRolDto: UpdateRolDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.rolsService.update(id, updateRolDto, req.user.idUser);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.ROLE_MANAGE)
  @Put(':id/permissions')
  replacePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceRolePermissionsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.rolsService.replacePermissions(id, dto, req.user.idUser);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.ROLE_MANAGE)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.rolsService.remove(id, req.user.idUser);
  }
}
