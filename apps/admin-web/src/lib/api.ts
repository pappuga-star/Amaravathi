import type { ApiResponse } from '@amaravathi/shared-types';

const API_URL =
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:4000/api';

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
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...options.headers,
    },
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success) {
    console.error('API Error Response:', payload);
    let msg = payload.message ?? 'API request failed';
    const errors = (payload as any).errors;
    if (errors) {
      if (errors.fieldErrors) {
        const details = Object.entries(errors.fieldErrors)
          .map(([field, errs]) => `${field}: ${(errs as string[]).join(', ')}`)
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
  return payload.data as T;
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
};
