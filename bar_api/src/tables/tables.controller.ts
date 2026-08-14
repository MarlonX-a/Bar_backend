import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PermissionsGuard } from '../auth/authorization/permissions.guard';
import { RequirePermissions } from '../auth/authorization/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { PermissionCode } from '../rols/permission.constants';
import { CreateTableDto } from './dto/create-table.dto';
import { ExchangeQrTokenDto } from './dto/exchange-qr-token.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { TablesService } from './tables.service';

@Controller()
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.TABLE_MANAGE)
  @Post('tables')
  create(@Body() dto: CreateTableDto, @Req() req: AuthenticatedRequest) {
    return this.tablesService.create(dto, req.user.idUser);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.TABLE_READ)
  @Get('tables')
  findAll() {
    return this.tablesService.findAll();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.TABLE_MANAGE)
  @Patch('tables/:id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateTableDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tablesService.update(id, dto, req.user.idUser);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.TABLE_QR_ROTATE)
  @Post('tables/:id/qr/rotate')
  rotateQr(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tablesService.rotateQr(id, req.user.idUser);
  }

  @Post('table-access/exchange')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  exchangeQrToken(@Body() dto: ExchangeQrTokenDto) {
    return this.tablesService.exchangeQrToken(dto.qrToken);
  }
}
