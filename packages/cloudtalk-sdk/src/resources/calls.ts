import type { AxiosInstance } from 'axios';

export interface CloudtalkCall {
  id: number;
  uuid: string;
  type: 'incoming' | 'outgoing';
  status: string;
  started_at: string;
  ended_at?: string;
  duration?: number;
  from_number?: string;
  to_number?: string;
  agent_id?: number;
  recorded?: boolean;
  tags?: string[];
}

export class CallsResource {
  constructor(private readonly http: AxiosInstance) {}

  async list(params?: {
    limit?: number;
    page?: number;
    date_from?: string;
    date_to?: string;
    agent_id?: number;
  }): Promise<CloudtalkCall[]> {
    const res = await this.http.get('/calls/index.json', { params });
    return res.data?.responseData?.data?.map((d: { Cdr: CloudtalkCall }) => d.Cdr) ?? [];
  }

  async get(id: number): Promise<CloudtalkCall | null> {
    const res = await this.http.get(`/calls/show/${id}.json`);
    return res.data?.responseData?.Cdr ?? null;
  }

  async recordingUrl(callId: number): Promise<string | null> {
    const res = await this.http.get(`/calls/recording/${callId}.json`);
    return res.data?.responseData?.url ?? null;
  }

  async clickToCall(params: { agent_id: number; callee_number: string }) {
    const res = await this.http.post('/calls/create.json', params);
    return res.data;
  }
}
