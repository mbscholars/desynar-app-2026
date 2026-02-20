import { api } from './client';
import type { OrdersListResponse } from './types';

const BASE = '/api/v1/orders';

export interface GetOrdersParams {
  page?: number;
  per_page?: number;
  status?: string;
}

export const ordersApi = {
  /** List orders for current user. Requires auth. */
  getList: (params?: GetOrdersParams) => {
    const search = new URLSearchParams();
    if (params?.page != null) search.set('page', String(params.page));
    if (params?.per_page != null) search.set('per_page', String(params.per_page));
    if (params?.status) search.set('status', params.status);
    const qs = search.toString();
    return api.get<OrdersListResponse>(qs ? `${BASE}?${qs}` : BASE);
  },

  /** Single order by reference. Requires auth. */
  getByReference: (reference: string) =>
    api.get<{ success: boolean; data: import('./types').Order }>(
      `${BASE}/${encodeURIComponent(reference)}`
    ),

  /** Cancel order. Requires auth. */
  cancel: (orderId: number, body?: { reason?: string }) =>
    api.post<{ success: boolean; message: string }>(`${BASE}/${orderId}/cancel`, body),
};
