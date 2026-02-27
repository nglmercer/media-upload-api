// ============================================================================
// Quota Client
// ============================================================================

import type { CoreClient } from './core';
import type { QuotaInfo, GlobalQuotaInfo } from './types';

export class QuotaClient {
  constructor(private client: CoreClient) {}

  async get(): Promise<QuotaInfo> {
    return this.client.request<QuotaInfo>('GET', '/api/quota');
  }

  async getGlobal(): Promise<GlobalQuotaInfo> {
    return this.client.request<GlobalQuotaInfo>('GET', '/api/quota/global');
  }
}
