import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CreateAppOrderDto } from './dto/create-app-order.dto';
import { CancelOrderDto, CancelOrderExceptionDto } from './dto/cancel-order.dto';
import { ListOwnOrdersQueryDto } from './dto/list-own-orders-query.dto';
import { ListOperationalOrdersQueryDto } from './dto/list-operational-orders-query.dto';
import { TransitionOrderDto } from './dto/transition-order.dto';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { PermissionsGuard } from '../auth/authorization/permissions.guard';
import { RequirePermissions } from '../auth/authorization/permissions.decorator';
import { PermissionCode } from '../rols/permission.constants';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  createAppOrder(
    @Body() dto: CreateAppOrderDto,
    @Headers('x-table-session') tableSessionToken: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: Request,
  ) {
    return this.ordersService.createAppOrder(
      dto,
      tableSessionToken,
      idempotencyKey,
      (req as Request & { requestId?: string }).requestId,
    );
  }

  @Get('mine')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  findOwnOrders(
    @Headers('x-table-session') tableSessionToken: string | undefined,
    @Query() query: ListOwnOrdersQueryDto,
  ) {
    return this.ordersService.listOwnOrders(tableSessionToken, query);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.ORDER_READ_OPERATIONAL)
  @Get('operational')
  findOperationalOrders(@Query() query: ListOperationalOrdersQueryDto) {
    return this.ordersService.listOperationalOrders(query);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.ORDER_READ_OPERATIONAL)
  @Get(':id/history')
  getStatusHistory(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.ordersService.getStatusHistory(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.ORDER_TRANSITION)
  @Post(':id/status')
  transition(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: TransitionOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ordersService.transition(id, dto, req.user.idUser, this.requestId(req));
  }

  @Post(':id/cancel')
  cancelOwnPendingOrder(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CancelOrderDto,
    @Headers('x-table-session') tableSessionToken: string | undefined,
    @Req() req: Request,
  ) {
    return this.ordersService.cancelOwnPendingOrder(
      id,
      dto,
      tableSessionToken,
      this.requestId(req),
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.ORDER_CANCEL_EXCEPTION)
  @Post(':id/cancel-exception')
  cancelException(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CancelOrderExceptionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ordersService.cancelException(
      id,
      dto,
      req.user.idUser,
      this.requestId(req),
    );
  }

  private requestId(req: Request): string | undefined {
    return (req as Request & { requestId?: string }).requestId;
  }
}
