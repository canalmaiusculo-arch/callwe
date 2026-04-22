import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async monthlyReport(subAccountId: string, year: number, month: number): Promise<Buffer> {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const sub = await this.prisma.subAccount.findUnique({ where: { id: subAccountId } });
    if (!sub) throw new Error('Sub-account not found');

    const [leads, interactions, wonLeads, topAgents] = await Promise.all([
      this.prisma.lead.count({
        where: { subAccountId, createdAt: { gte: start, lt: end }, deletedAt: null },
      }),
      this.prisma.interaction.findMany({
        where: { subAccountId, startedAt: { gte: start, lt: end } },
        select: { type: true, direction: true, durationSeconds: true, status: true },
      }),
      this.prisma.lead.count({
        where: { subAccountId, status: 'won', updatedAt: { gte: start, lt: end } },
      }),
      this.prisma.interaction.groupBy({
        by: ['agentUserId'],
        where: { subAccountId, type: 'call', startedAt: { gte: start, lt: end }, agentUserId: { not: null } },
        _count: { _all: true },
        _sum: { durationSeconds: true },
        orderBy: { _count: { agentUserId: 'desc' } },
        take: 5,
      }),
    ]);

    const calls = interactions.filter((i) => i.type === 'call');
    const missed = calls.filter((c) => c.status === 'missed').length;
    const totalTalkTime = calls.reduce((sum, c) => sum + (c.durationSeconds ?? 0), 0);
    const sms = interactions.filter((i) => i.type === 'sms').length;

    const users = await this.prisma.user.findMany({
      where: { id: { in: topAgents.map((a) => a.agentUserId!).filter(Boolean) } },
      select: { id: true, fullName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.fullName]));

    return this.renderPdf({
      clientName: sub.name,
      period: `${String(month).padStart(2, '0')}/${year}`,
      leads,
      calls: calls.length,
      inboundCalls: calls.filter((c) => c.direction === 'inbound').length,
      outboundCalls: calls.filter((c) => c.direction === 'outbound').length,
      missed,
      totalTalkTime,
      sms,
      wonLeads,
      conversionRate: leads > 0 ? Math.round((wonLeads / leads) * 100) : 0,
      topAgents: topAgents.map((a) => ({
        name: userMap.get(a.agentUserId!) ?? '—',
        calls: a._count._all,
        talkTime: a._sum.durationSeconds ?? 0,
      })),
    });
  }

  private renderPdf(data: {
    clientName: string;
    period: string;
    leads: number;
    calls: number;
    inboundCalls: number;
    outboundCalls: number;
    missed: number;
    totalTalkTime: number;
    sms: number;
    wonLeads: number;
    conversionRate: number;
    topAgents: Array<{ name: string; calls: number; talkTime: number }>;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).fillColor('#0f172a').text('Relatório Mensal', { align: 'left' });
      doc.fontSize(14).fillColor('#64748b').text(`${data.clientName}  ·  ${data.period}`);
      doc.moveDown(1.5);

      // KPIs em grade
      const kpis = [
        { label: 'Leads', value: data.leads },
        { label: 'Chamadas', value: data.calls },
        { label: 'Chamadas perdidas', value: data.missed },
        { label: 'SMS', value: data.sms },
        { label: 'Tempo ao telefone', value: formatDuration(data.totalTalkTime) },
        { label: 'Conversão', value: `${data.conversionRate}%` },
      ];

      doc.fontSize(12).fillColor('#0f172a').text('Indicadores do período', { underline: false });
      doc.moveDown(0.5);
      let x = 50;
      let y = doc.y;
      const colWidth = 160;
      const rowHeight = 55;
      kpis.forEach((kpi, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cx = 50 + col * colWidth;
        const cy = y + row * rowHeight;
        doc.rect(cx, cy, colWidth - 10, rowHeight - 5).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#64748b').fontSize(9).text(kpi.label, cx + 10, cy + 8);
        doc.fillColor('#0f172a').fontSize(18).text(String(kpi.value), cx + 10, cy + 22);
      });
      doc.moveTo(0, y + Math.ceil(kpis.length / 3) * rowHeight + 10);
      doc.y = y + Math.ceil(kpis.length / 3) * rowHeight + 20;

      // Breakdown chamadas
      doc.fontSize(12).fillColor('#0f172a').text('Chamadas');
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#475569');
      doc.text(`Recebidas: ${data.inboundCalls}`);
      doc.text(`Realizadas: ${data.outboundCalls}`);
      doc.text(`Perdidas: ${data.missed}`);
      doc.moveDown(1);

      // Top atendentes
      doc.fontSize(12).fillColor('#0f172a').text('Atendentes com mais volume');
      doc.moveDown(0.5);
      if (data.topAgents.length === 0) {
        doc.fontSize(10).fillColor('#94a3b8').text('Sem atendimentos no período.');
      } else {
        data.topAgents.forEach((a) => {
          doc
            .fontSize(10)
            .fillColor('#0f172a')
            .text(`${a.name}`, { continued: true })
            .fillColor('#64748b')
            .text(`   ${a.calls} chamadas  ·  ${formatDuration(a.talkTime)} falados`);
        });
      }

      // Footer
      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .text(`Gerado em ${new Date().toLocaleString('pt-BR')}  ·  CallWe`, { align: 'center' });

      doc.end();
    });
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
