/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  costPrice: number; // For admin profit calculations
  category: string;
  images: string[]; // List of multiple product image URLs
  enabled: boolean;
  stock: number;
  traditionalBenefit?: string; // e.g. "Sacred digestive recipe containing divine herbal blends"
  weight?: string; // e.g. "250g", "500g"
  ingredients?: string[]; // e.g. ["Pure ghee", "Cardamom", "Basmati", "Saffron"]
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  address?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus = 'Pending' | 'Dispatched' | 'Delivered' | 'Cancelled';

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    costPrice: number;
  }[];
  totalPrice: number;
  orderDate: string; // ISO String
  status: OrderStatus;
  paymentMethod: 'UPI' | 'COD' | 'WhatsAppLink';
  paymentStatus: 'Pending' | 'Completed' | 'Refunded';
  invoiceNumber: string;
  whatsappSent: boolean;
  emailSent: boolean;
  notes?: string;
}

export interface Expense {
  id: string;
  month: string; // YYYY-MM
  category: string; // e.g., "Temple ingredients", "Packaging", "Shipping", "Rent"
  amount: number;
  description: string;
  date: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  date: string;
  resolved: boolean;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  senderEmail: string;
}

export interface WhatsAppConfig {
  apiKey: string;
  phoneId: string;
  routingMode: 'DirectWeb' | 'CloudAPI';
  recipientNumber: string; // default store owner number
}
