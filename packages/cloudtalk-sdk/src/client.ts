import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { AgentsResource } from './resources/agents.js';
import { CallsResource } from './resources/calls.js';
import { ContactsResource } from './resources/contacts.js';
import { NumbersResource } from './resources/numbers.js';
import { SmsResource } from './resources/sms.js';
import { TagsResource } from './resources/tags.js';
import { GroupsResource } from './resources/groups.js';
import { CueCardsResource } from './resources/cuecards.js';

export interface CloudtalkClientOptions {
  keyId: string;
  keySecret: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class CloudtalkClient {
  readonly http: AxiosInstance;
  readonly agents: AgentsResource;
  readonly calls: CallsResource;
  readonly contacts: ContactsResource;
  readonly numbers: NumbersResource;
  readonly sms: SmsResource;
  readonly tags: TagsResource;
  readonly groups: GroupsResource;
  readonly cueCards: CueCardsResource;

  constructor(opts: CloudtalkClientOptions) {
    const auth = Buffer.from(`${opts.keyId}:${opts.keySecret}`).toString('base64');
    this.http = axios.create({
      baseURL: opts.baseUrl ?? 'https://api.cloudtalk.io/v1',
      timeout: opts.timeoutMs ?? 15_000,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    axiosRetry(this.http, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (err) => {
        const status = err.response?.status;
        return axiosRetry.isNetworkError(err) || status === 429 || (status !== undefined && status >= 500);
      },
    });

    this.agents = new AgentsResource(this.http);
    this.calls = new CallsResource(this.http);
    this.contacts = new ContactsResource(this.http);
    this.numbers = new NumbersResource(this.http);
    this.sms = new SmsResource(this.http);
    this.tags = new TagsResource(this.http);
    this.groups = new GroupsResource(this.http);
    this.cueCards = new CueCardsResource(this.http);
  }
}
