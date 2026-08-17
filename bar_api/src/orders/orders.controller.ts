import { Body, Controller, Get, Headers, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CreateAppOrderDto } from './dto/create-app-order.dto';
import { ListOwnOrdersQueryDto } from './dto/list-own-orders-query.dto';
import { OrdersService } from './orders.service';

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
}
