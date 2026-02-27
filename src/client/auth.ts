// ============================================================================
// Auth Client
// ============================================================================

import type { CoreClient } from './core';
import type { TokenInfo } from './types';

export class AuthClient {
  constructor(private client: CoreClient) {}

  async validate(): Promise<{ valid: boolean; userId?: string }> {
    try {
      return await this.client.request('GET', '/api/auth/validate');
    } catch {
      return { valid: false };
    }
  }

  async getInfo(): Promise<TokenInfo | { authenticated: false }> {
    try {
      return await this.client.request<TokenInfo>('GET', '/api/auth/info');
    } catch {
      return { authenticated: false };
    }
  }

  async getPermissions(): Promise<{ permissions: string[] }> {
    return this.client.request('GET', '/api/auth/permissions');
  }
}
