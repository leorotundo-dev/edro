/**
 * API Client Unificado para Edro
 * 
 * Cliente HTTP padronizado para comunicação com o backend.
 * Usado tanto no Frontend Admin quanto no Frontend Aluno.
 */

export interface ApiClientConfig {
  baseURL: string;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class ApiClient {
  private baseURL: string;
  private getToken: () => string | null;
  private onUnauthorized: () => void;

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL;
    this.getToken = config.getToken || (() => null);
    this.onUnauthorized = config.onUnauthorized || (() => {});
  }

  /**
   * Build headers com Authorization se token existir
   */
  private buildHeaders(customHeaders?: Record<string, string>): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Build URL com query params
   */
  private buildURL(path: string, params?: Record<string, any>): string {
    const url = new URL(path, this.baseURL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Handle response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      this.onUnauthorized();
      throw new Error('Unauthorized');
    }

    if (response.status === 204) {
      return {} as T;
    }

    if (!response.ok) {
      const errorText = await response.text();
      let parsed: any = null;

      try {
        parsed = errorText ? JSON.parse(errorText) : null;
      } catch {
        parsed = null;
      }

      const message =
        parsed?.error ||
        parsed?.message ||
        errorText ||
        response.statusText ||
        'Erro inesperado';

      throw new ApiError(response.status, message, parsed ?? errorText);
    }

    return response.json();
  }

  /**
   * GET request
   */
  async get<T = any>(path: string, options?: RequestOptions): Promise<T> {
    const url = this.buildURL(path, options?.params);
    const headers = this.buildHeaders(options?.headers);

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * POST request
   */
  async post<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    const url = this.buildURL(path, options?.params);
    const headers = this.buildHeaders(options?.headers);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * PUT request
   */
  async put<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    const url = this.buildURL(path, options?.params);
    const headers = this.buildHeaders(options?.headers);

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    const url = this.buildURL(path, options?.params);
    const headers = this.buildHeaders(options?.headers);

    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(path: string, options?: RequestOptions): Promise<T> {
    const url = this.buildURL(path, options?.params);
    const headers = this.buildHeaders(options?.headers);

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    return this.handleResponse<T>(response);
  }
}

/**
 * Factory para criar instância do API Client
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

/**
 * Helper para uso em browser (localStorage)
 */
export function createBrowserApiClient(baseURL: string): ApiClient {
  return new ApiClient({
    baseURL,
    getToken: () => {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem('token') || localStorage.getItem('edro_token');
    },
    onUnauthorized: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('edro_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    },
  });
}
