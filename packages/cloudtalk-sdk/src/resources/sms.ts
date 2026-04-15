import type { AxiosInstance } from 'axios';

export class SmsResource {
  constructor(private readonly http: AxiosInstance) {}

  async send(params: { agent_id: number; to: string; text: string }) {
    const res = await this.http.post('/messages/send.json', params);
    return res.data?.responseData;
  }

  async list(params?: { page?: number; limit?: number; date_from?: string; date_to?: string }) {
    const res = await this.http.get('/messages/index.json', { params });
    return res.data?.responseData?.data ?? [];
  }
}
