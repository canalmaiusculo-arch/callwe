import type { AxiosInstance } from 'axios';

export interface CloudtalkNumber {
  id: number;
  internal_name: string;
  public_number: string;
  country_code: string;
  monthly_price?: number;
}

export class NumbersResource {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<CloudtalkNumber[]> {
    const res = await this.http.get('/numbers/index.json');
    return res.data?.responseData?.data?.map((d: { Number: CloudtalkNumber }) => d.Number) ?? [];
  }
}
