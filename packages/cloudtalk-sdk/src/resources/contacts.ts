import type { AxiosInstance } from 'axios';

export interface CloudtalkContact {
  id?: number;
  name: string;
  company?: string;
  title?: string;
  industry?: string;
  website?: string;
  address?: string;
  city?: string;
  country_id?: string;
  favorite_agent?: number;
  ContactNumber?: Array<{ public_number: string }>;
  ContactEmail?: Array<{ email: string }>;
  ContactsTag?: Array<{ name: string }>;
}

export class ContactsResource {
  constructor(private readonly http: AxiosInstance) {}

  async create(contact: CloudtalkContact) {
    const res = await this.http.post('/contacts/add.json', contact);
    return res.data?.responseData;
  }

  async update(id: number, contact: Partial<CloudtalkContact>) {
    const res = await this.http.put(`/contacts/edit/${id}.json`, contact);
    return res.data?.responseData;
  }

  async search(phoneNumber: string) {
    const res = await this.http.get('/contacts/index.json', {
      params: { 'filters[public_number]': phoneNumber },
    });
    return res.data?.responseData?.data ?? [];
  }
}
