import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../auth/authorization/permissions.guard';
import { RequirePermissions } from '../auth/authorization/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { PermissionCode } from '../rols/permission.constants';
import { OpenBusinessDayDto } from './dto/open-business-day.dto';
import { InventoryService } from './inventory.service';

@Controller('business-days')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(
    PermissionCode.BUSINESS_DAY_OPEN,
    PermissionCode.INVENTORY_OPEN,
  )
  @Post('open')
  open(@Body() dto: OpenBusinessDayDto, @Req() req: AuthenticatedRequest) {
    return this.inventoryService.openBusinessDay(dto, req.user.idUser);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.INVENTORY_READ)
  @Get('current')
  getCurrent() {
    return this.inventoryService.getOpenBusinessDay();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.INVENTORY_READ)
  @Get('current/inventory')
  getCurrentInventory() {
    return this.inventoryService.getOpenBusinessDayInventory();
  }
}
