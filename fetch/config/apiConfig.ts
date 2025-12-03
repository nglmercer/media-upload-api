export interface ProxyConfig {
  enabled: boolean;
  url: string;
  auth?: {
    username: string;
    password: string;
  };
  timeout?: number;
}

export interface ApiConfig {
  host: string;
  port?: number | string;
  protocol: 'http' | 'https';
  apiPrefix?: string;

  // Methods
  getFullUrl: () => string;
  getWsUrl: () => string; // <--- New Method Definition
  // Updated Omit to include getWsUrl
  update: (newConfig: Partial<Omit<ApiConfig, 'getFullUrl' | 'getWsUrl' | 'update'>>) => void;
  proxy?: ProxyConfig;
}

// 2. Adapters Interface
interface EnvironmentAdapter {
  // Updated Omit to include getWsUrl
  getConfig: () => Partial<Omit<ApiConfig, 'getFullUrl' | 'getWsUrl' | 'update'>>;
}

// 3. Concrete Adapters

// Adapter for Development
const DevelopmentAdapter: EnvironmentAdapter = {
  getConfig: () => ({
    host: import.meta.env.VITE_API_HOST || '127.0.0.1',
    port: import.meta.env.VITE_API_PORT || 3000,
    protocol: 'http',
    proxy: import.meta.env.VITE_USE_PROXY === 'true' ? {
      enabled: true,
      url: import.meta.env.VITE_PROXY_URL || 'http://localhost:3001',
      auth: (import.meta.env.VITE_PROXY_USERNAME && import.meta.env.VITE_PROXY_PASSWORD) ? {
        username: import.meta.env.VITE_PROXY_USERNAME,
        password: import.meta.env.VITE_PROXY_PASSWORD
      } : undefined,
      timeout: 30000
    } : undefined
  })
};

// Adapter for Production
const ProductionAdapter: EnvironmentAdapter = {
  getConfig: () => {
    const isBrowser = typeof window !== 'undefined';
    const defaultHost = isBrowser ? window.location.hostname : 'localhost';
    const defaultProtocol = isBrowser && window.location.protocol.includes('https') ? 'https' : 'https';

    return {
      host: import.meta.env.VITE_API_HOST || defaultHost,
      port: import.meta.env.VITE_API_PORT ? Number(import.meta.env.VITE_API_PORT) : undefined,
      protocol: (import.meta.env.VITE_API_PROTOCOL as 'http' | 'https') || defaultProtocol,
      proxy: undefined
    };
  }
};

// 4. Factory
const getConfigAdapter = (): EnvironmentAdapter => {
  if (import.meta.env.MODE === 'production') {
    return ProductionAdapter;
  }
  return DevelopmentAdapter;
};

// 5. Implementation
const createApiConfig = (): ApiConfig => {
  const adapter = getConfigAdapter();
  const initialConfig = adapter.getConfig();

  return {
    host: initialConfig.host || 'localhost',
    port: initialConfig.port,
    protocol: initialConfig.protocol || 'http',
    proxy: initialConfig.proxy,

    getFullUrl() {
      const protocol = this.protocol;
      const host = this.host;
      const port = this.port;

      const isStandardPort =
        (!port) ||
        (protocol === 'http' && Number(port) === 80) ||
        (protocol === 'https' && Number(port) === 443);

      const portSuffix = isStandardPort ? '' : `:${port}`;

      return `${protocol}://${host}${portSuffix}`;
    },

    // --- New Implementation ---
    getWsUrl() {
      // Determine protocol: http -> ws, https -> wss
      const isSecure = this.protocol === 'https';
      const wsProtocol = isSecure ? 'wss' : 'ws';

      const host = this.host;
      const port = this.port;

      // Re-use logic: Omit port if it's standard for the protocol
      // Note: ws uses port 80, wss uses port 443 (same as http/s)
      const isStandardPort =
        (!port) ||
        (this.protocol === 'http' && Number(port) === 80) ||
        (this.protocol === 'https' && Number(port) === 443);

      const portSuffix = isStandardPort ? '' : `:${port}`;

      return `${wsProtocol}://${host}${portSuffix}`;
    },

    update(newConfig) {
      Object.assign(this, newConfig);
      // Optional: Log both URLs to verify update
      // console.log('[ApiConfig] Updated.', { http: this.getFullUrl(), ws: this.getWsUrl() });
    }
  };
};

export const apiConfig = createApiConfig();

export default apiConfig;