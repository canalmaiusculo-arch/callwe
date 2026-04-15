import type { AxiosInstance } from 'axios';

export class TagsResource {
  constructor(private readonly http: AxiosInstance) {}

  async list() {
    const res = await this.http.get('/tags/index.json');
    return res.data?.responseData?.data ?? [];
  }

  async create(name: string) {
    const res = await this.http.post('/tags/add.json', { name });
    return res.data?.responseData;
  }

  async attachToCall(callId: number, tagIds: number[]) {
    const res = await this.http.post(`/calls/tags/add/${callId}.json`, { tags: tagIds });
    return res.data?.responseData;
  }
}
