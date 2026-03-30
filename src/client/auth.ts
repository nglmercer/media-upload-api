import type { CoreClient } from './core';
import type { TokenInfo, LoginResult, RegisterResult, LogoutResult } from './types';

export class AuthClient {
  constructor(private client: CoreClient) {}

  async register(data: Record<string, any>): Promise<RegisterResult> {
    return this.client.request<RegisterResult>('POST', '/api/auth/register', {
      body: data
    });
  }

  async login(data: Record<string, any>): Promise<LoginResult> {
    const res = await this.client.request<LoginResult>('POST', '/api/auth/login', {
      body: data
    });

    if (res.success && res.sessionId) {
      this.client.setToken(res.sessionId);
    }

    return res;
  }

  async logout(): Promise<LogoutResult> {
    const res = await this.client.request<LogoutResult>('POST', '/api/auth/logout');
    if (res.success) {
      this.client.setToken(null);
    }
    return res;
  }

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
