'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, MessagesSquare, Facebook, Instagram, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslate } from '@/i18n/provider';

interface Conversation {
  id: string;
  channel: 'messenger' | 'instagram';
  contactName: string | null;
  contactAvatar: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  lastInboundAt: string | null;
  subAccount: { id: string; name: string } | null;
  lead: { id: string; name: string | null; status: string } | null;
}

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  text: string | null;
  createdAt: string;
  senderUser: { id: string; fullName: string } | null;
}

function fmtTime(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function MessengerInbox({ filterSubAccountId }: { filterSubAccountId: string | null }) {
  const { t } = useTranslate();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['messenger-conversations'],
    queryFn: () => apiClient.get('/messenger/conversations'),
    refetchInterval: 15_000,
  });

  const shown = filterSubAccountId
    ? conversations.filter((c) => c.subAccount?.id === filterSubAccountId)
    : conversations;

  const { data: thread } = useQuery<{ messages: Message[]; windowOpen: boolean }>({
    queryKey: ['messenger-thread', selectedId],
    queryFn: () => apiClient.get(`/messenger/conversations/${selectedId}/messages`),
    enabled: !!selectedId,
    refetchInterval: 10_000,
  });

  const selected = shown.find((c) => c.id === selectedId) ?? null;

  const send = useMutation({
    mutationFn: (text: string) =>
      apiClient.post(`/messenger/conversations/${selectedId}/messages`, { text }),
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['messenger-thread', selectedId] });
      qc.invalidateQueries({ queryKey: ['messenger-conversations'] });
    },
    onError: (err: Error) =>
      toast.error(
        err.message === 'messaging_window_closed' ? t('messengerInbox.windowClosed') : err.message,
      ),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages.length]);

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-lg border bg-background">
      {/* Lista de conversas */}
      <div className="flex w-72 shrink-0 flex-col border-r">
        <div className="border-b p-3">
          <p className="text-sm font-semibold">{t('messengerInbox.title')}</p>
          <p className="text-xs text-muted-foreground">{shown.length} {t('messengerInbox.conversations')}</p>
        </div>
        <div className="flex-1 overflow-auto">
          {shown.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center text-muted-foreground">
              <MessagesSquare className="mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">{t('messengerInbox.empty')}</p>
            </div>
          )}
          {shown.map((c) => {
            const Icon = c.channel === 'instagram' ? Instagram : Facebook;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`flex w-full items-start gap-2 border-b p-3 text-left transition-colors hover:bg-muted/40 ${
                  selectedId === c.id ? 'bg-muted/60' : ''
                }`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${c.channel === 'instagram' ? 'text-pink-600' : 'text-blue-600'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{c.contactName ?? t('messengerInbox.contact')}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{fmtTime(c.lastMessageAt)}</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{c.lastMessageText ?? '—'}</p>
                  {c.subAccount && <p className="truncate text-[10px] text-muted-foreground/70">{c.subAccount.name}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            {t('messengerInbox.selectConversation')}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b p-3">
              {selected.channel === 'instagram' ? (
                <Instagram className="h-4 w-4 text-pink-600" />
              ) : (
                <Facebook className="h-4 w-4 text-blue-600" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{selected.contactName ?? t('messengerInbox.contact')}</p>
                {selected.subAccount && <p className="truncate text-xs text-muted-foreground">{selected.subAccount.name}</p>}
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-auto bg-muted/20 p-4">
              {thread?.messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      m.direction === 'outbound' ? 'bg-primary text-primary-foreground' : 'border bg-background'
                    }`}
                  >
                    {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                    <p className={`mt-1 text-[10px] ${m.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {m.senderUser ? `${m.senderUser.fullName} · ` : ''}{fmtTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="border-t p-3">
              {thread && !thread.windowOpen ? (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                  <Clock className="h-4 w-4 shrink-0" />
                  {t('messengerInbox.windowClosedHint')}
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (draft.trim()) send.mutate(draft.trim());
                      }
                    }}
                    placeholder={t('messengerInbox.replyPlaceholder')}
                    rows={2}
                    className="min-h-10 resize-none"
                  />
                  <Button
                    onClick={() => draft.trim() && send.mutate(draft.trim())}
                    disabled={!draft.trim() || send.isPending}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
