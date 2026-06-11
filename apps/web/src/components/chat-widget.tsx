'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, X, ChevronLeft, Send, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/auth-store';

interface Conversation {
  leadId: string;
  leadName: string;
  subAccountId: string;
  subAccountName: string;
  lastMessage: { body: string; at: string; authorRole: string | null };
  unread: number;
}
interface LeadHit {
  leadId: string;
  leadName: string;
  subAccountId: string;
  subAccountName: string;
}
interface Message {
  id: string;
  body: string;
  createdAt: string;
  authorUserId: string;
  authorRole: string | null;
  author: { id: string; fullName: string } | null;
}

const ROLE_LABEL: Record<string, string> = {
  client_viewer: 'Cliente', agent: 'Atendente', sub_account_admin: 'Atendente',
  agency_admin: 'Agência', super_admin: 'Agência',
};

function jwtSub(token: string): string {
  try {
    const payload = token.split('.')[1] ?? '';
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).sub ?? '';
  } catch {
    return '';
  }
}

function fmtTime(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function ChatWidget() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [newMode, setNewMode] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [msg, setMsg] = useState('');

  const myId = token ? jwtSub(token) : '';

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: () => apiClient.get('/conversations'),
    enabled: !!token,
    refetchInterval: 15_000,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['conversation', selected?.leadId],
    queryFn: () => apiClient.get(`/conversations/${selected!.leadId}/messages`),
    enabled: open && !!selected,
    refetchInterval: 8_000,
  });

  const { data: foundLeads = [] } = useQuery<LeadHit[]>({
    queryKey: ['conv-leads', leadSearch],
    queryFn: () => apiClient.get(`/conversations/leads?search=${encodeURIComponent(leadSearch)}`),
    enabled: open && newMode,
  });

  const markRead = useMutation({
    mutationFn: (leadId: string) => apiClient.post(`/conversations/${leadId}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const send = useMutation({
    mutationFn: (body: string) => apiClient.post(`/conversations/${selected!.leadId}/messages`, { body }),
    onSuccess: () => {
      setMsg('');
      qc.invalidateQueries({ queryKey: ['conversation', selected?.leadId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!token) return null;

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  function openConversation(c: Conversation) {
    setSelected(c);
    setNewMode(false);
    if (c.unread > 0) markRead.mutate(c.leadId);
  }

  function startConversation(l: LeadHit) {
    setSelected({ ...l, lastMessage: { body: '', at: '', authorRole: null }, unread: 0 });
    setNewMode(false);
    setLeadSearch('');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-white shadow-lg transition-transform hover:scale-105"
        aria-label="Conversas"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && totalUnread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[70vh] max-h-[600px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
          {selected ? (
            /* ---- Thread ---- */
            <>
              <div className="flex items-center gap-2 border-b p-3">
                <button type="button" onClick={() => setSelected(null)} className="rounded-md p-1 hover:bg-muted">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{selected.leadName}</p>
                  <p className="truncate text-xs text-muted-foreground">{selected.subAccountName}</p>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-auto p-3">
                {messages.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma mensagem. Mande a primeira abaixo.</p>
                )}
                {messages.map((m) => {
                  const mine = m.authorUserId === myId;
                  return (
                    <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          mine ? 'bg-brand-gradient text-white' : 'border bg-muted/40'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.body}</p>
                      </div>
                      <span className="mt-1 text-[10px] text-muted-foreground">
                        {m.author?.fullName ?? '—'}
                        {m.authorRole && ` · ${ROLE_LABEL[m.authorRole] ?? m.authorRole}`} · {fmtTime(m.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (msg.trim()) send.mutate(msg.trim());
                }}
                className="flex items-end gap-2 border-t p-3"
              >
                <Textarea
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="Escreva uma mensagem..."
                  rows={1}
                  className="max-h-24 min-h-9 resize-none"
                />
                <Button type="submit" size="icon" disabled={!msg.trim() || send.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : newMode ? (
            /* ---- Nova conversa ---- */
            <>
              <div className="flex items-center gap-2 border-b p-3">
                <button type="button" onClick={() => setNewMode(false)} className="rounded-md p-1 hover:bg-muted">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <p className="text-sm font-semibold">Nova conversa</p>
              </div>
              <div className="border-b p-3">
                <div className="flex items-center gap-2 rounded-md border px-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Buscar lead por nome ou telefone..."
                    className="border-0 px-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {foundLeads.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground">Nenhum lead encontrado.</p>
                )}
                {foundLeads.map((l) => (
                  <button
                    key={l.leadId}
                    type="button"
                    onClick={() => startConversation(l)}
                    className="flex w-full flex-col border-b p-3 text-left hover:bg-muted/40"
                  >
                    <span className="text-sm font-medium">{l.leadName}</span>
                    <span className="text-xs text-muted-foreground">{l.subAccountName}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* ---- Lista de conversas ---- */
            <>
              <div className="flex items-center justify-between border-b p-4">
                <div>
                  <h3 className="font-semibold">Conversas</h3>
                  <p className="text-xs text-muted-foreground">Mensagens sobre seus leads</p>
                </div>
                <Button size="icon" variant="outline" onClick={() => setNewMode(true)} aria-label="Nova conversa">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-auto">
                {conversations.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground">
                    Nenhuma conversa ainda. Toque em <strong>+</strong> para iniciar uma.
                  </p>
                )}
                {conversations.map((c) => (
                  <button
                    key={c.leadId}
                    type="button"
                    onClick={() => openConversation(c)}
                    className="flex w-full items-start gap-3 border-b p-3 text-left hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{c.leadName}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{fmtTime(c.lastMessage.at)}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.subAccountName} · {c.lastMessage.body}
                      </p>
                    </div>
                    {c.unread > 0 && (
                      <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
                        {c.unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
