"use strict";
/**
 * API Client Unificado para Edro
 *
 * Cliente HTTP padronizado para comunicação com o backend.
 * Usado tanto no Frontend Admin quanto no Frontend Aluno.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
exports.createApiClient = createApiClient;
exports.createBrowserApiClient = createBrowserApiClient;
class ApiClient {
    constructor(config) {
        this.baseURL = config.baseURL;
        this.getToken = config.getToken || (() => null);
        this.onUnauthorized = config.onUnauthorized || (() => { });
    }
    /**
     * Build headers com Authorization se token existir
     */
    buildHeaders(customHeaders) {
        const headers = {
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
    buildURL(path, params) {
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
    async handleResponse(response) {
        if (response.status === 401) {
            this.onUnauthorized();
            throw new Error('Unauthorized');
        }
        if (response.status === 204) {
            return {};
        }
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        return response.json();
    }
    /**
     * GET request
     */
    async get(path, options) {
        const url = this.buildURL(path, options?.params);
        const headers = this.buildHeaders(options?.headers);
        const response = await fetch(url, {
            method: 'GET',
            headers,
        });
        return this.handleResponse(response);
    }
    /**
     * POST request
     */
    async post(path, body, options) {
        const url = this.buildURL(path, options?.params);
        const headers = this.buildHeaders(options?.headers);
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        return this.handleResponse(response);
    }
    /**
     * PUT request
     */
    async put(path, body, options) {
        const url = this.buildURL(path, options?.params);
        const headers = this.buildHeaders(options?.headers);
        const response = await fetch(url, {
            method: 'PUT',
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        return this.handleResponse(response);
    }
    /**
     * PATCH request
     */
    async patch(path, body, options) {
        const url = this.buildURL(path, options?.params);
        const headers = this.buildHeaders(options?.headers);
        const response = await fetch(url, {
            method: 'PATCH',
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        return this.handleResponse(response);
    }
    /**
     * DELETE request
     */
    async delete(path, options) {
        const url = this.buildURL(path, options?.params);
        const headers = this.buildHeaders(options?.headers);
        const response = await fetch(url, {
            method: 'DELETE',
            headers,
        });
        return this.handleResponse(response);
    }
}
exports.ApiClient = ApiClient;
/**
 * Factory para criar instância do API Client
 */
function createApiClient(config) {
    return new ApiClient(config);
}
/**
 * Helper para uso em browser (localStorage)
 */
function createBrowserApiClient(baseURL) {
    return new ApiClient({
        baseURL,
        getToken: () => {
            if (typeof window === 'undefined')
                return null;
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
