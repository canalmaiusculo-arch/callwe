import { CloudtalkClient } from '@callwe/cloudtalk-sdk';
import { env } from '../env.js';

export const cloudtalk = new CloudtalkClient({
  keyId: env.CLOUDTALK_API_KEY_ID,
  keySecret: env.CLOUDTALK_API_KEY_SECRET,
  baseUrl: env.CLOUDTALK_API_BASE_URL,
});
