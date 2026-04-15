import type { AxiosInstance } from 'axios';

export interface CloudtalkGroup {
  id: number;
  internal_name: string;
  external_name?: string;
}

export class GroupsResource {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<CloudtalkGroup[]> {
    const res = await this.http.get('/groups/index.json');
    return res.data?.responseData?.data?.map((d: { Group: CloudtalkGroup }) => d.Group) ?? [];
  }
}
