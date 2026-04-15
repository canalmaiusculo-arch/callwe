import { Injectable } from '@nestjs/common';
import { CloudtalkClient } from '@callwe/cloudtalk-sdk';
import { env } from '../../config/env.js';

@Injectable()
export class CloudtalkService {
  readonly client: CloudtalkClient;

  constructor() {
    this.client = new CloudtalkClient({
      keyId: env.CLOUDTALK_API_KEY_ID,
      keySecret: env.CLOUDTALK_API_KEY_SECRET,
      baseUrl: env.CLOUDTALK_API_BASE_URL,
    });
  }
}
