import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PermissionsGuard } from '../auth/authorization/permissions.guard';
import { RequirePermissions } from '../auth/authorization/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { PermissionCode } from '../rols/permission.constants';
import { CreateConsumptionDto } from './dto/create-consumption.dto';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { ListInventoryMovementsQueryDto } from './dto/list-inventory-movements-query.dto';
import { OpenBusinessDayDto } from './dto/open-business-day.dto';
import { InventoryService } from './inventory.service';

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(
    PermissionCode.BUSINESS_DAY_OPEN,
    PermissionCode.INVENTORY_OPEN,
  )
  @Post('business-days/open')
  open(@Body() dto: OpenBusinessDayDto, @Req() req: AuthenticatedRequest) {
    return this.inventoryService.openBusinessDay(dto, req.user.idUser);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.INVENTORY_READ)
  @Get('business-days/current')
  getCurrent() {
    return this.inventoryService.getOpenBusinessDay();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.INVENTORY_READ)
  @Get('business-days/current/inventory')
  getCurrentInventory() {
    return this.inventoryService.getOpenBusinessDayInventory();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.INVENTORY_READ)
  @Get('inventory/movements')
  listMovements(@Query() query: ListInventoryMovementsQueryDto) {
    return this.inventoryService.listCurrentMovements(query);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.INVENTORY_RESTOCK)
  @Post('inventory/restocks')
  restock(
    @Body() dto: CreateInventoryMovementDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.inventoryService.restock(
      dto,
      req.user.idUser,
      idempotencyKey,
      this.requestId(req),
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.INVENTORY_GIFT)
  @Post('inventory/gifts')
  gift(
    @Body() dto: CreateInventoryMovementDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.inventoryService.gift(
      dto,
      req.user.idUser,
      idempotencyKey,
      this.requestId(req),
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.INVENTORY_CONSUMPTION)
  @Post('inventory/consumptions')
  consumption(
    @Body() dto: CreateConsumptionDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.inventoryService.consumption(
      dto,
      req.user.idUser,
      idempotencyKey,
      this.requestId(req),
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.INVENTORY_WASTE)
  @Post('inventory/waste')
  waste(
    @Body() dto: CreateInventoryMovementDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.inventoryService.waste(
      dto,
      req.user.idUser,
      idempotencyKey,
      this.requestId(req),
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.INVENTORY_ADJUST)
  @Post('inventory/adjustments')
  adjust(
    @Body() dto: CreateInventoryAdjustmentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.inventoryService.adjust(
      dto,
      req.user.idUser,
      idempotencyKey,
      this.requestId(req),
    );
  }

  private requestId(req: AuthenticatedRequest): string | undefined {
    return (req as AuthenticatedRequest & { requestId?: string }).requestId;
  }
}
