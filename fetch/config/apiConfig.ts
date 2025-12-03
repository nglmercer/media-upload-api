// src/config/apiConfig.ts

// 1. Define una interfaz clara para la configuración
// types.ts - Tipos para la configuración de proxy
interface ProxyConfig {
  enabled: boolean;
  url: string;
  auth?: {
    username: string;
    password: string;
  };
  timeout?: number;
}

interface ApiConfig {
  host: string;
  port: number | string;
  protocol: 'http' | 'https';
  getFullUrl: () => string;
  update: (newConfig: Partial<Omit<ApiConfig, 'getFullUrl' | 'update'>>) => void;
  proxy?: ProxyConfig;
}
/*
const windowurl: string = typeof window !== "undefined" ? window.location.origin : "";
// 2. Crea el objeto de configuración como la única fuente de la verdad
  protocol: import.meta.env.MODE === 'development' ? 'http' : 'https',
  api Unoficial y local, en el build usamos http y no http porque no es un deploy ni esta en el mismo dominio
*/
// src/config/apiConfig.ts
const apiConfig: ApiConfig = {
  host: import.meta.env.VITE_API_HOST || '127.0.0.1',
  port: import.meta.env.VITE_API_PORT || 3000,
  protocol: 'http',
  getFullUrl(): string {
    return `${this.protocol}://${this.host}:${this.port}`;
  },
  update(newConfig) {
    Object.assign(this, newConfig);
    console.log('API config updated:', this.getFullUrl());
  },
  // Agregar configuración del proxy basada en variables de entorno
  proxy: import.meta.env.VITE_USE_PROXY === 'true' ? {
    enabled: true,
    url: import.meta.env.VITE_PROXY_URL || 'http://localhost:3001',
    auth: (import.meta.env.VITE_PROXY_USERNAME && import.meta.env.VITE_PROXY_PASSWORD) ? {
      username: import.meta.env.VITE_PROXY_USERNAME,
      password: import.meta.env.VITE_PROXY_PASSWORD
    } : undefined,
    timeout: 30000
  } : undefined
};

export default apiConfig;
export type{ ApiConfig, ProxyConfig,apiConfig};