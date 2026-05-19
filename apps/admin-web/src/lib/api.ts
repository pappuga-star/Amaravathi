import type { ApiResponse } from '@amaravathi/shared-types';

const API_URL =
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:4000/api';
const ENABLE_API_PROFILING = import.meta.env.VITE_API_PROFILING === 'true';
let inFlightApiCalls = 0;

export function getToken() {
  return localStorage.getItem('amaravathi_admin_token');
}

export function setToken(token: string) {
  localStorage.setItem('amaravathi_admin_token', token);
}

export function clearToken() {
  localStorage.removeItem('amaravathi_admin_token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const startedAt =
    typeof performance !== 'undefined' ? performance.now() : Date.now();
  inFlightApiCalls += 1;
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...options.headers,
      },
    });
    const elapsedMs =
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) -
      startedAt;
    if (ENABLE_API_PROFILING) {
      console.log(
        `[api-profiler] ${options.method ?? 'GET'} ${path} status=${response.status} time=${elapsedMs.toFixed(2)}ms inFlight=${inFlightApiCalls}`,
      );
    }

    if (response.status === 204) {
      return null as T;
    }

    const contentType = response.headers.get('content-type') ?? '';
    let rawBody = '';
    try {
      rawBody = await response.text();
    } catch {
      rawBody = '';
    }

    const trimmedBody = rawBody.trim();
    if (!trimmedBody) {
      if (!response.ok) {
        throw new Error(`API request failed (${response.status})`);
      }
      return null as T;
    }

    const shouldTryJson =
      contentType.includes('application/json') ||
      trimmedBody.startsWith('{') ||
      trimmedBody.startsWith('[');

    let parsed: unknown = trimmedBody;
    if (shouldTryJson) {
      try {
        parsed = JSON.parse(trimmedBody);
      } catch {
        parsed = trimmedBody;
      }
    }

    if (!response.ok) {
      if (parsed && typeof parsed === 'object') {
        const payload = parsed as Partial<ApiResponse<T>> & {
          errors?: unknown;
        };
        console.error('API Error Response:', payload);
        let msg = payload.message ?? `API request failed (${response.status})`;
        const errors = payload.errors as any;
        if (errors) {
          if (errors.fieldErrors) {
            const details = Object.entries(errors.fieldErrors)
              .map(
                ([field, errs]) => `${field}: ${(errs as string[]).join(', ')}`,
              )
              .join('; ');
            msg += `: ${details}`;
          } else if (typeof errors === 'object') {
            const details = Object.entries(errors)
              .map(([field, err]: any) => `${field}: ${err.message || err}`)
              .join('; ');
            msg += `: ${details}`;
          }
        }
        throw new Error(msg);
      }

      const fallbackText =
        typeof parsed === 'string' && parsed.trim()
          ? parsed.trim()
          : `API request failed (${response.status})`;
      throw new Error(fallbackText);
    }

    if (parsed && typeof parsed === 'object' && 'success' in parsed) {
      const payload = parsed as ApiResponse<T>;
      if (!payload.success) {
        throw new Error(payload.message ?? 'API request failed');
      }
      return payload.data as T;
    }

    return parsed as T;
  } finally {
    inFlightApiCalls = Math.max(0, inFlightApiCalls - 1);
  }
}

export const endpoints = {
  teaPowderTypes: '/tea-powder-types',
  batches: '/add-purchase-batch',
  generalItems: '/general-items',
  generalItemsMaster: '/general-items-master',
  users: '/users',
  sellers: '/sellers',
  customers: '/customers',
  leafCategories: '/leaf-categories',
  customerTeaFormulas: '/customer-tea-formulas',
  systemSettings: '/system-settings',
};
