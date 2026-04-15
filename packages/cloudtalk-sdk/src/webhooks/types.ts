export type CloudtalkWebhookEvent =
  | 'call.started'
  | 'call.ended'
  | 'call.missed'
  | 'recording.ready'
  | 'voicemail.received'
  | 'sms.received'
  | 'sms.sent'
  | 'agent.status_changed';

export interface CloudtalkCallWebhookPayload {
  event_type: CloudtalkWebhookEvent;
  call_uuid: string;
  call_id?: number;
  type: 'incoming' | 'outgoing';
  from_number: string;
  to_number: string;
  agent_id?: number;
  started_at: string;
  ended_at?: string;
  duration?: number;
  tags?: string[];
  recording_url?: string;
}

export interface CloudtalkSmsWebhookPayload {
  event_type: 'sms.received' | 'sms.sent';
  message_id: number;
  from_number: string;
  to_number: string;
  body: string;
  received_at: string;
  agent_id?: number;
  tags?: string[];
}

export type CloudtalkWebhookPayload = CloudtalkCallWebhookPayload | CloudtalkSmsWebhookPayload;
