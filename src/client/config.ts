// ============================================================================
// Config Client
// ============================================================================

import type { CoreClient } from './core';
import type { PublicConfig } from './types';

export class ConfigClient {
  constructor(private client: CoreClient) {}

  async get(): Promise<PublicConfig> {
    return this.client.request<PublicConfig>('GET', '/api/config');
  }

  async getServer(): Promise<Record<string, unknown>> {
    return this.client.request('GET', '/api/config/server');
  }

  async update(config: Record<string, unknown>): Promise<void> {
    await this.client.request('PUT', '/api/config', {
      body: JSON.stringify(config),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async addToken(
    token: string,
    tokenConfig: {
      userId: string;
      label: string;
      permissions?: string[];
      expiresAt?: number;
      quota?: { maxStorageBytes?: number; maxFiles?: number };
    }
  ): Promise<{ userId: string; label: string }> {
    return this.client.request('POST', '/api/config/token', {
      body: JSON.stringify({ token, ...tokenConfig }),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async removeToken(userId: string): Promise<void> {
    await this.client.request('DELETE', `/api/config/token/${userId}`);
  }

  async listTokens(): Promise<{ tokens: unknown[] }> {
    return this.client.request('GET', '/api/config/tokens');
  }
}
