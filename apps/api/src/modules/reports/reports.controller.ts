import { Controller, Get, Header, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ReportsService } from './reports.service.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  /** Relatório mensal em PDF. Query: ?year=2026&month=4 */
  @Get('monthly.pdf')
  @Header('Content-Type', 'application/pdf')
  async monthly(
    @Req() req: { tenant: { subAccountId: string } },
    @Query('year') year: string,
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    const y = year ? Number(year) : new Date().getFullYear();
    const m = month ? Number(month) : new Date().getMonth() + 1;
    const pdf = await this.svc.monthlyReport(req.tenant.subAccountId, y, m);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-${y}-${String(m).padStart(2, '0')}.pdf"`,
    );
    res.setHeader('Content-Length', String(pdf.length));
    res.end(pdf);
  }
}
