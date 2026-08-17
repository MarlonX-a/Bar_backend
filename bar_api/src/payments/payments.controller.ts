import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PermissionsGuard } from '../auth/authorization/permissions.guard';
import { RequirePermissions } from '../auth/authorization/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { PermissionCode } from '../rols/permission.constants';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentReasonDto } from './dto/payment-reason.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PermissionCode.PAYMENT_VERIFY)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() dto: CreatePaymentDto, @Req() req: AuthenticatedRequest) {
    return this.paymentsService.create(dto, req.user.idUser, this.requestId(req));
  }

  @Get('order/:orderId')
  findByOrder(
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
  ) {
    return this.paymentsService.findByOrder(orderId);
  }

  @Post(':id/verify')
  verify(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.verify(id, req.user.idUser, this.requestId(req));
  }

  @Post(':id/reject')
  reject(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: PaymentReasonDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.reject(id, dto, req.user.idUser, this.requestId(req));
  }

  @Post(':id/void')
  void(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: PaymentReasonDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.void(id, dto, req.user.idUser, this.requestId(req));
  }

  private requestId(req: AuthenticatedRequest): string | undefined {
    return (req as AuthenticatedRequest & { requestId?: string }).requestId;
  }
}
