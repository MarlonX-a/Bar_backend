import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../auth/authorization/permissions.guard';
import { RequirePermissions } from '../auth/authorization/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { PermissionCode } from '../rols/permission.constants';
import { CashService } from './cash.service';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';

@Controller('cash-sessions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Post('open')
  @RequirePermissions(PermissionCode.CASH_OPEN)
  open(@Body() dto: OpenCashSessionDto, @Req() req: AuthenticatedRequest) {
    return this.cashService.open(dto, req.user.idUser, this.requestId(req));
  }

  @Get('current')
  @RequirePermissions(PermissionCode.CASH_READ)
  getCurrent() {
    return this.cashService.getCurrent();
  }

  @Post('close')
  @RequirePermissions(PermissionCode.CASH_CLOSE)
  close(@Body() dto: CloseCashSessionDto, @Req() req: AuthenticatedRequest) {
    return this.cashService.close(dto, req.user.idUser, this.requestId(req));
  }

  private requestId(req: AuthenticatedRequest): string | undefined {
    return (req as AuthenticatedRequest & { requestId?: string }).requestId;
  }
}
