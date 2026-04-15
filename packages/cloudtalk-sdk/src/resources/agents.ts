import type { AxiosInstance } from 'axios';

export interface CloudtalkAgent {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  extension?: string;
  availability_status?: string;
}

export class AgentsResource {
  constructor(private readonly http: AxiosInstance) {}

  async list(params?: { limit?: number; page?: number }): Promise<CloudtalkAgent[]> {
    const res = await this.http.get('/agents/index.json', { params });
    return res.data?.responseData?.data?.map((d: { Agent: CloudtalkAgent }) => d.Agent) ?? [];
  }

  async get(id: number): Promise<CloudtalkAgent | null> {
    const res = await this.http.get(`/agents/show/${id}.json`);
    return res.data?.responseData?.Agent ?? null;
  }
}
