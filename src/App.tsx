import React, { useState, useEffect } from 'react';
import { Product, Order, Expense, ContactMessage, SMTPConfig, WhatsAppConfig, OrderStatus } from './types';
import AdminPages from './components/AdminPages';
import { api } from './api/client';

export default function App() {
  const [currentTab, setCurrentTab] = useState('admin-dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [smtpConfig, setSmtpConfig] = useState<SMTPConfig>({
    host: 'smtp.gmail.com', port: 465, secure: true, username: '', senderEmail: ''
  });
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig>({
    apiKey: '', phoneId: '', routingMode: 'DirectWeb', recipientNumber: ''
  });
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [apiOffline, setApiOffline] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  const loadAll = (isRefresh = false) => {
    if (isRefresh) setReloading(true);
    else setLoading(true);
    Promise.all([
      api.getProducts(),
      api.getOrders(),
      api.getExpenses(),
      api.getContactMessages(),
      api.getSMTP(),
      api.getWhatsApp(),
    ]).then(([p, o, e, m, s, w]) => {
      setApiOffline(false);
      setProducts(p);
      setOrders(o);
      setExpenses(e);
      setContactMessages(m);
      setSmtpConfig(s);
      setWhatsappConfig(w);
      setLastLoadedAt(new Date());
    }).catch(() => setApiOffline(true))
      .finally(() => {
        setLoading(false);
        setReloading(false);
      });
  };

  useEffect(() => { loadAll(); }, []);

  const handleAddProduct = (prod: Product) => {
    api.addProduct(prod).then(() => api.getProducts()).then(setProducts);
  };

  const handleEditProduct = (prod: Product) => {
    api.editProduct(prod).then(() => api.getProducts()).then(setProducts);
  };

  const handleDeleteProduct = (id: string) => {
    api.deleteProduct(id).then(() => api.getProducts()).then(setProducts);
  };

  const handleChangeOrderStatus = (id: string, status: OrderStatus) => {
    api.changeOrderStatus(id, status).then(() => api.getOrders()).then(setOrders);
  };

  const handleDeleteOrder = (id: string) => {
    api.deleteOrder(id).then(() => api.getOrders()).then(setOrders);
  };

  const handleAddExpense = (exp: Expense) => {
    api.addExpense(exp).then(() => api.getExpenses()).then(setExpenses);
  };

  const handleDeleteExpense = (id: string) => {
    api.deleteExpense(id).then(() => api.getExpenses()).then(setExpenses);
  };

  const handleToggleMessageResolved = (id: string) => {
    api.toggleMessageResolved(id).then(() => api.getContactMessages()).then(setContactMessages);
  };

  const handleDeleteMessage = (id: string) => {
    api.deleteMessage(id).then(() => api.getContactMessages()).then(setContactMessages);
  };

  const handleUpdateSMTP = (cfg: SMTPConfig) => {
    setSmtpConfig(cfg);
  };

  const handleUpdateWhatsApp = (cfg: WhatsAppConfig) => {
    api.updateWhatsApp(cfg).then(setWhatsappConfig);
  };

  const AdminParticles = () => (
    <div className="admin-console-particles" aria-hidden="true">
      {Array.from({ length: 20 }, (_, i) => (
        <span
          key={i}
          className="admin-console-dot"
          style={{
            left: `${(i * 4.2 + 3) % 97}%`,
            ['--drift' as string]: `${(i % 2 === 0 ? 1 : -1) * (6 + (i % 16))}px`,
            animationDuration: `${14 + (i % 12)}s`,
            animationDelay: `${(i * 0.6) % 12}s`,
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
            opacity: 0.45 + (i % 4) * 0.1,
          }}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen admin-app flex flex-col items-center justify-center gap-4">
        <AdminParticles />
        <p className="relative z-10 text-sm font-bold tracking-widest uppercase admin-h">
          Loading Admin Console
        </p>
        <div className="admin-loading-dots relative z-10">
          <span /><span /><span />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen admin-app relative">
      {apiOffline && (
        <div className="relative z-20 bg-[#3d1515] border-b border-red-800 text-red-200 text-center text-xs py-2 px-4">
          API server is offline. Start it separately: <code className="font-mono">cd backend && npm run dev</code>
        </div>
      )}
      <AdminPages
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        products={products}
        onAddProduct={handleAddProduct}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
        orders={orders}
        onChangeOrderStatus={handleChangeOrderStatus}
        onDeleteOrder={handleDeleteOrder}
        expenses={expenses}
        onAddExpense={handleAddExpense}
        onDeleteExpense={handleDeleteExpense}
        contactMessages={contactMessages}
        onToggleMessageResolved={handleToggleMessageResolved}
        onDeleteMessage={handleDeleteMessage}
        smtpConfig={smtpConfig}
        onUpdateSMTP={handleUpdateSMTP}
        whatsappConfig={whatsappConfig}
        onUpdateWhatsApp={handleUpdateWhatsApp}
        apiOnline={!apiOffline}
        lastLoadedAt={lastLoadedAt}
        onReloadData={() => loadAll(true)}
        reloading={reloading}
      />
    </div>
  );
}
