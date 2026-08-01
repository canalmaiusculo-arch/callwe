export interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  tasks?: string[];
}

export interface MetaLeadForm {
  id: string;
  name: string;
  status: string;
  page_id?: string;
}

export interface MetaLeadField {
  name: string;
  values: string[];
}

export interface MetaLead {
  id: string;
  created_time: string;
  ad_id?: string;
  form_id: string;
  field_data: MetaLeadField[];
}

export interface MetaMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: Array<{ type: string; payload: { url?: string } }>;
    is_echo?: boolean;
  };
  postback?: { title?: string; payload?: string; mid?: string };
  read?: { watermark: number };
}

export interface MetaWebhookEntry {
  id: string;
  time: number;
  changes?: Array<{
    field: 'leadgen';
    value: {
      leadgen_id: string;
      page_id: string;
      form_id: string;
      adgroup_id?: string;
      ad_id?: string;
      created_time: number;
    };
  }>;
  // Presente nos eventos de mensageria (Messenger/Instagram).
  messaging?: MetaMessagingEvent[];
}

export interface MetaWebhookPayload {
  object: 'page' | 'instagram';
  entry: MetaWebhookEntry[];
}
