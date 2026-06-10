import { NextResponse } from 'next/server';

// Recebe o quiz "Lead Audit" do site e cria o lead no CallWe via webhook de formulário.
// A API key fica SÓ no servidor (env), nunca no navegador.
//   LEAD_WEBHOOK_URL  → default: https://api.callwe.digital/api/webhooks/leads
//   LEAD_WEBHOOK_KEY  → API key da subconta que recebe os leads do site (X-CallWe-Api-Key)
const WEBHOOK_URL = process.env.LEAD_WEBHOOK_URL ?? 'https://api.callwe.digital/api/webhooks/leads';
const WEBHOOK_KEY = process.env.LEAD_WEBHOOK_KEY ?? '';

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const name = String(body.name ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const email = String(body.email ?? '').trim();

  if (!name || (!phone && !email)) {
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });
  }

  // Sem key configurada: não derruba a experiência do visitante, mas registra o problema.
  if (!WEBHOOK_KEY) {
    console.warn('[lead-audit] LEAD_WEBHOOK_KEY não configurada — lead NÃO foi salvo:', { name, phone, email });
    return NextResponse.json({ ok: true, saved: false });
  }

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CallWe-Api-Key': WEBHOOK_KEY },
      body: JSON.stringify({
        name,
        phone,
        email,
        source: 'form',
        formName: 'Lead Audit (site)',
        businessName: body.businessName ?? '',
        industry: body.industry ?? '',
        leadsPerMonth: body.leadsPerMonth ?? '',
        responseTime: body.responseTime ?? '',
        whoAnswers: body.whoAnswers ?? '',
        customerValue: body.customerValue ?? '',
        interestedPlan: body.interestedPlan ?? '',
        lang: body.lang ?? '',
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[lead-audit] webhook respondeu', res.status, text);
      return NextResponse.json({ ok: false, error: 'webhook error' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, saved: true });
  } catch (err) {
    console.error('[lead-audit] falha ao chamar webhook', err);
    return NextResponse.json({ ok: false, error: 'upstream' }, { status: 502 });
  }
}
