import type { ContactMessage, Expense, Order, OrderStatus, Product, SMTPConfig, WhatsAppConfig } from '../types';

const API = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');

function backendNotConfiguredMessage(): string {
  return 'The admin API is not connected to the backend server. Check that Node.js 18+ is running with backend/index.js as startup file.';
}

async function parseJsonResponse<T>(res: Response, text: string): Promise<T> {
  if (text.trim().startsWith('It works')) {
    throw new Error(backendNotConfiguredMessage());
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.ok
        ? 'The server returned an unexpected response.'
        : `API error: ${res.status}`,
    );
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const text = await res.text();

  if (!res.ok) {
    try {
      const body = await parseJsonResponse<{ error?: string }>(res, text);
      throw new Error(body.error || `API error: ${res.status}`);
    } catch (err) {
      throw err instanceof Error ? err : new Error(`API error: ${res.status}`);
    }
  }
  if (res.status === 204) return undefined as T;
  return parseJsonResponse<T>(res, text);
}

export const api = {
  getProducts: () => request<Product[]>('/products/all'),
  addProduct: (product: Product) => request<Product>('/products', { method: 'POST', body: JSON.stringify(product) }),
  editProduct: (product: Product) => request<Product>(`/products/${product.id}`, { method: 'PUT', body: JSON.stringify(product) }),
  deleteProduct: (id: string) => request<void>(`/products/${id}`, { method: 'DELETE' }),

  getOrders: () => request<Order[]>('/orders'),
  changeOrderStatus: (id: string, status: OrderStatus) =>
    request<Order>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteOrder: (id: string) => request<void>(`/orders/${id}`, { method: 'DELETE' }),

  getExpenses: () => request<Expense[]>('/expenses'),
  addExpense: (expense: Expense) => request<Expense>('/expenses', { method: 'POST', body: JSON.stringify(expense) }),
  deleteExpense: (id: string) => request<void>(`/expenses/${id}`, { method: 'DELETE' }),

  getContactMessages: () => request<ContactMessage[]>('/contact-messages'),
  toggleMessageResolved: (id: string) => request<ContactMessage>(`/contact-messages/${id}/resolved`, { method: 'PATCH' }),
  deleteMessage: (id: string) => request<void>(`/contact-messages/${id}`, { method: 'DELETE' }),

  getSMTP: () => request<SMTPConfig>('/config/smtp'),
  updateSMTP: (config: SMTPConfig) => request<SMTPConfig>('/config/smtp', { method: 'PUT', body: JSON.stringify(config) }),

  getWhatsApp: () => request<WhatsAppConfig>('/config/whatsapp'),
  updateWhatsApp: (config: WhatsAppConfig) => request<WhatsAppConfig>('/config/whatsapp', { method: 'PUT', body: JSON.stringify(config) }),
};
