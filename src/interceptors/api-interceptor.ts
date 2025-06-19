/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable security/detect-object-injection */
import { ApiInterceptorConfig, HttpMethod, ILogger } from '../types';
import { maskUrlParameters } from '../utils/sensitive-data';

// Generic API interceptor base class
export abstract class BaseApiInterceptor {
  protected logger: ILogger;
  protected config: ApiInterceptorConfig;

  constructor(logger: ILogger, config: Partial<ApiInterceptorConfig> = {}) {
    this.logger = logger;
    this.config = {
      logRequests: true,
      logResponses: true,
      logHeaders: false,
      logBodies: true,
      maskSensitiveData: true,
      sensitiveFields: ['authorization', 'cookie', 'x-api-key', 'token'],
      maxBodyLength: 5000,
      ...config,
    };
  }

  protected maskHeaders(headers: Record<string, string>): Record<string, string> {
    if (!this.config.maskSensitiveData) {
      return headers;
    }

    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (
        this.config.sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))
      ) {
        masked[key] = '***';
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  protected maskBody(body: any): any {
    if (!this.config.maskSensitiveData || !body) {
      return body;
    }

    if (typeof body === 'string') {
      return body.length > this.config.maxBodyLength
        ? body.substring(0, this.config.maxBodyLength) + '...[truncated]'
        : body;
    }

    return body;
  }

  protected getMethodFromString(method: string): HttpMethod {
    const uppercased = method.toUpperCase();
    const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    return validMethods.includes(uppercased as HttpMethod) ? (uppercased as HttpMethod) : 'GET';
  }
}

// Fetch API interceptor
export class FetchInterceptor extends BaseApiInterceptor {
  private originalFetch: typeof fetch;

  constructor(logger: ILogger, config?: Partial<ApiInterceptorConfig>) {
    super(logger, config);
    this.originalFetch = globalThis.fetch;
  }

  install(): void {
    const self = this;

    globalThis.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const startTime = Date.now();
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = self.getMethodFromString(init?.method ?? 'GET');

      // Request logging
      if (self.config.logRequests) {
        const requestHeaders = init?.headers ? self.headersToObject(init.headers) : {};
        const maskedUrl = self.config.maskSensitiveData
          ? maskUrlParameters(url, self.config.sensitiveFields)
          : url;

        self.logger.logApiRequest(method, maskedUrl, {
          requestHeaders: self.config.logHeaders ? self.maskHeaders(requestHeaders) : undefined,
          requestBody: self.config.logBodies ? self.maskBody(init?.body) : undefined,
        });
      }

      try {
        const response = await self.originalFetch(input, init);
        const responseTime = Date.now() - startTime;

        // Response logging
        if (self.config.logResponses) {
          const responseHeaders = self.config.logHeaders
            ? self.maskHeaders(self.headersToObject(response.headers))
            : undefined;

          let responseBody;
          if (self.config.logBodies) {
            try {
              const clonedResponse = response.clone();
              const text = await clonedResponse.text();
              responseBody = self.maskBody(text);
            } catch (e) {
              responseBody = '[Unable to read response body]';
            }
          }

          self.logger.logApiResponse(method, url, response.status, responseTime, {
            responseHeaders,
            responseBody,
          });
        }

        return response;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        self.logger.logApiError(method, url, error as Error, {
          context: { responseTime },
        });
        throw error;
      }
    };
  }

  uninstall(): void {
    globalThis.fetch = this.originalFetch;
  }

  private headersToObject(headers: HeadersInit): Record<string, string> {
    const obj: Record<string, string> = {};

    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        obj[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        obj[key] = value;
      });
    } else if (headers) {
      Object.assign(obj, headers);
    }

    return obj;
  }
}

// Axios interceptor
export class AxiosInterceptor extends BaseApiInterceptor {
  install(axiosInstance: any): void {
    const self = this;

    // Request interceptor
    axiosInstance.interceptors.request.use(
      (config: any) => {
        const startTime = Date.now();
        config.metadata = { startTime };

        if (self.config.logRequests) {
          const maskedUrl = self.config.maskSensitiveData
            ? maskUrlParameters(config.url, self.config.sensitiveFields)
            : config.url;

          self.logger.logApiRequest(self.getMethodFromString(config.method), maskedUrl, {
            requestHeaders: self.config.logHeaders
              ? self.maskHeaders(config.headers || {})
              : undefined,
            requestBody: self.config.logBodies ? self.maskBody(config.data) : undefined,
          });
        }

        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    axiosInstance.interceptors.response.use(
      (response: any) => {
        const responseTime = Date.now() - response.config.metadata.startTime;

        if (self.config.logResponses) {
          self.logger.logApiResponse(
            self.getMethodFromString(response.config.method),
            response.config.url,
            response.status,
            responseTime,
            {
              responseHeaders: self.config.logHeaders
                ? self.maskHeaders(response.headers || {})
                : undefined,
              responseBody: self.config.logBodies ? self.maskBody(response.data) : undefined,
            }
          );
        }

        return response;
      },
      (error: any) => {
        const responseTime = error.config?.metadata?.startTime
          ? Date.now() - error.config.metadata.startTime
          : 0;

        self.logger.logApiError(
          self.getMethodFromString(error.config?.method || 'GET'),
          error.config?.url || 'unknown',
          error,
          {
            context: {
              responseTime,
              status: error.response?.status,
              statusText: error.response?.statusText,
            },
          }
        );

        return Promise.reject(error);
      }
    );
  }
}

// XMLHttpRequest interceptor
export class XHRInterceptor extends BaseApiInterceptor {
  private originalXHR: typeof XMLHttpRequest;

  constructor(logger: ILogger, config?: Partial<ApiInterceptorConfig>) {
    super(logger, config);
    this.originalXHR = globalThis.XMLHttpRequest;
  }

  install(): void {
    const self = this;

    globalThis.XMLHttpRequest = class extends self.originalXHR {
      private startTime?: number;
      private method?: string;
      private url?: string;

      override open(
        method: string,
        url: string | URL,
        async?: boolean,
        user?: string | null,
        password?: string | null
      ): void {
        this.method = method;
        this.url = typeof url === 'string' ? url : url.toString();
        this.startTime = Date.now();

        super.open(method, url, async ?? true, user, password);
      }

      override send(body?: Document | XMLHttpRequestBodyInit | null): void {
        if (self.config.logRequests && this.method && this.url) {
          const maskedUrl = self.config.maskSensitiveData
            ? maskUrlParameters(this.url, self.config.sensitiveFields)
            : this.url;

          self.logger.logApiRequest(self.getMethodFromString(this.method), maskedUrl, {
            requestBody: self.config.logBodies ? self.maskBody(body) : undefined,
          });
        }

        this.addEventListener('loadend', () => {
          if (this.method && this.url && this.startTime) {
            const responseTime = Date.now() - this.startTime;

            if (this.status >= 400) {
              self.logger.logApiError(
                self.getMethodFromString(this.method),
                this.url,
                new Error(`HTTP ${this.status}: ${this.statusText}`),
                {
                  context: { responseTime, status: this.status, statusText: this.statusText },
                }
              );
            } else if (self.config.logResponses) {
              self.logger.logApiResponse(
                self.getMethodFromString(this.method),
                this.url,
                this.status,
                responseTime,
                {
                  responseBody: self.config.logBodies
                    ? self.maskBody(this.responseText)
                    : undefined,
                }
              );
            }
          }
        });

        super.send(body);
      }
    } as any;
  }

  uninstall(): void {
    globalThis.XMLHttpRequest = this.originalXHR;
  }
}
