import React, { useState, useEffect } from 'react';
import { 
  Building, LayoutDashboard, Plus, Edit, Trash2, Calendar, FileText, 
  Settings, MessageCircle, Mail, DollarSign, ArrowUpRight, TrendingUp, Check, Eye,
  Download, Printer, ShieldCheck, Award, RefreshCw
} from 'lucide-react';
import { Product, Order, Expense, ContactMessage, SMTPConfig, WhatsAppConfig, OrderStatus } from '../types';
import { api } from '../api/client';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface AdminPagesProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
  products: Product[];
  onAddProduct: (prod: Product) => void;
  onEditProduct: (prod: Product) => void;
  onDeleteProduct: (id: string) => void;
  orders: Order[];
  onChangeOrderStatus: (id: string, status: OrderStatus) => void;
  onDeleteOrder: (id: string) => void;
  expenses: Expense[];
  onAddExpense: (exp: Expense) => void;
  onDeleteExpense: (id: string) => void;
  contactMessages: ContactMessage[];
  onToggleMessageResolved: (id: string) => void;
  onDeleteMessage: (id: string) => void;
  smtpConfig: SMTPConfig;
  onUpdateSMTP: (cfg: SMTPConfig) => void;
  whatsappConfig: WhatsAppConfig;
  onUpdateWhatsApp: (cfg: WhatsAppConfig) => void;
  apiOnline?: boolean;
  lastLoadedAt?: Date | null;
  onReloadData?: () => void;
  reloading?: boolean;
}

export default function AdminPages({
  currentTab,
  onChangeTab,
  products,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  orders,
  onChangeOrderStatus,
  onDeleteOrder,
  expenses,
  onAddExpense,
  onDeleteExpense,
  contactMessages,
  onToggleMessageResolved,
  onDeleteMessage,
  smtpConfig,
  onUpdateSMTP,
  whatsappConfig,
  onUpdateWhatsApp,
  apiOnline = true,
  lastLoadedAt,
  onReloadData,
  reloading = false,
}: AdminPagesProps) {

  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const base64Promises: Promise<string>[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      base64Promises.push(new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      }));
    }

    Promise.all(base64Promises).then((base64Urls) => {
      setProductForm((prev) => ({
        ...prev,
        images: [...prev.images, ...base64Urls],
      }));
    });
  };

  // Admin Auth login
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState({ username: 'admin', password: 'admin' });
  const [loginError, setLoginError] = useState('');

  // Dashboard monthly filter state
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('All'); // YYYY-MM

  // Product edit states
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState<Omit<Product, 'id'>>({
    name: '',
    description: '',
    price: 150,
    costPrice: 60,
    category: 'Podi Varieties',
    images: ['https://images.unsplash.com/photo-1541832676-9b763b0239ab?q=80&w=600'],
    enabled: true,
    stock: 100,
    traditionalBenefit: '',
    weight: '500g',
    ingredients: ['Ghee', 'Organic Sugar / Jaggery', 'Gram Flour']
  });

  // Expense manual form state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState<Omit<Expense, 'id' | 'date'>>({
    month: '2026-05',
    category: 'Temple Ingredients',
    amount: 1200,
    description: 'Fresh Cardamom spices bulk purchase'
  });

  // Invoice generator overlay state
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const getOrderStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case 'Delivered':
        return 'bg-white text-black border-white';
      case 'Dispatched':
        return 'bg-indigo-100 text-indigo-900 border-indigo-400';
      case 'Pending':
        return 'bg-[#262626] text-white border-[#505050]';
      default:
        return 'bg-[#1a1a1a] text-white/80 border-[#404040]';
    }
  };

  const getPaymentStatusLabel = (paymentStatus: Order['paymentStatus']) => {
    switch (paymentStatus) {
      case 'Completed':
        return 'SUCCESS PAID';
      case 'Refunded':
        return 'REFUNDED';
      default:
        return 'PAYMENT PENDING';
    }
  };

  const getPaymentStatusClass = (paymentStatus: Order['paymentStatus']) => {
    switch (paymentStatus) {
      case 'Completed':
        return 'text-[#1b4332]';
      case 'Refunded':
        return 'text-[#9b1c1c]';
      default:
        return 'text-[#b45309]';
    }
  };

  const getInvoiceRoyalStatusClass = (status: OrderStatus) => {
    switch (status) {
      case 'Delivered':
        return 'bg-[#5c1a1b] text-[#f5e6b8] border-[#c9a227]';
      case 'Dispatched':
        return 'bg-[#3d3520] text-[#e9c46a] border-[#d4af37]';
      case 'Pending':
        return 'bg-[#fff8f0] text-[#6b5b4f] border-[#d4a017]/40';
      default:
        return 'bg-[#fff8f0] text-[#9b1c1c] border-[#9b1c1c]/30';
    }
  };

  const solidifyAdminInvoiceForPdfCapture = (root: HTMLElement) => {
    root.style.background = '#ffffff';
    root.style.color = '#2c1810';
    root.style.borderRadius = '0';
    root.style.border = '1px solid #d4a017';
    root.style.boxShadow = 'none';
    root.style.overflow = 'visible';

    root.querySelectorAll<HTMLElement>('*').forEach((node) => {
      node.style.animation = 'none';
      node.style.backdropFilter = 'none';
      node.style.setProperty('-webkit-backdrop-filter', 'none');
      if (node.classList.contains('ab-invoice-brand-band')) {
        node.style.background = '#4a1e1e';
        node.style.color = '#f5e6b8';
      }
    });
  };

  const handleDownloadPDF = async () => {
    if (!selectedInvoiceOrder) return;
    setIsGeneratingPDF(true);
    try {
      const element = document.getElementById('tax-invoice-printable-doc');
      if (!element) return;

      element.scrollIntoView({ block: 'start' });
      await document.fonts.ready;

      const captureWidth = 794;
      const prevWidth = element.style.width;
      const prevMaxWidth = element.style.maxWidth;
      element.style.width = `${captureWidth}px`;
      element.style.maxWidth = `${captureWidth}px`;

      const canvas = await html2canvas(element, {
        scale: 2,
        width: captureWidth,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (_doc, clonedEl) => {
          clonedEl.style.width = `${captureWidth}px`;
          clonedEl.style.maxWidth = `${captureWidth}px`;
          solidifyAdminInvoiceForPdfCapture(clonedEl);
        },
      });

      element.style.width = prevWidth;
      element.style.maxWidth = prevMaxWidth;

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = 210;
      const pageHeight = 297;

      pdf.setFillColor(255, 251, 245);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setFillColor(74, 30, 30);
      pdf.rect(0, 0, pageWidth, 2.5, 'F');
      pdf.setFillColor(212, 160, 23);
      pdf.rect(0, 2.5, pageWidth, 1, 'F');

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const finalHeight = Math.min(imgHeight, pageHeight - 4);
      const finalWidth = (canvas.width * finalHeight) / canvas.height;
      const xOffset = (pageWidth - finalWidth) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, 3, finalWidth, finalHeight - 3);

      pdf.setDrawColor(212, 160, 23);
      pdf.setLineWidth(0.35);
      pdf.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');

      pdf.save(`Agrahara_Bhojanam_Invoice_${selectedInvoiceOrder.invoiceNumber}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  // Sub-tabs in admin panel
  const [adminSubTab, setAdminSubTab] = useState<'dashboard' | 'products' | 'orders' | 'expenses' | 'messages' | 'configs'>('dashboard');
  const [smtpDraft, setSmtpDraft] = useState<SMTPConfig>(smtpConfig);
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTestStatus, setSmtpTestStatus] = useState('');

  useEffect(() => {
    setSmtpDraft(smtpConfig);
  }, [smtpConfig]);

  const ADMIN_NAV = [
    { key: 'dashboard' as const, label: 'Financial Core', icon: LayoutDashboard },
    { key: 'products' as const, label: 'Food Inventory', icon: Building },
    { key: 'orders' as const, label: 'Customer Orders', icon: FileText },
    { key: 'expenses' as const, label: 'Manual Expenses', icon: DollarSign },
    { key: 'messages' as const, label: 'Public Queries', icon: Mail },
    { key: 'configs' as const, label: 'SMTP & WhatsApp', icon: Settings },
  ];

  const activeNavLabel = ADMIN_NAV.find((t) => t.key === adminSubTab)?.label ?? 'Admin';

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser.username === 'admin' && adminUser.password === 'admin') {
      setIsAdminLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Invalid Administrator credentials (Hint: admin / admin)');
    }
  };

  // Get available months based on orders and expenses for filter lists
  const allMonths = Array.from(new Set([
    ...orders.map(o => o.orderDate.substring(0, 7)),
    ...expenses.map(e => e.month)
  ])).sort((a,b) => b.localeCompare(a));

  // Determine active dataset filtered by month
  const filteredOrdersByMonth = selectedMonthFilter === 'All' 
    ? orders 
    : orders.filter(o => o.orderDate.substring(0, 7) === selectedMonthFilter);

  const filteredExpensesByMonth = selectedMonthFilter === 'All'
    ? expenses
    : expenses.filter(e => e.month === selectedMonthFilter);

  // FINANCIAL CALCULATIONS based on active monthly filters
  const metricsSales = filteredOrdersByMonth
    .filter(o => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + o.totalPrice, 0);

  // Real margin is: (Order Items Sold quantity * (sellingPrice - costPrice))
  const metricsProfit = filteredOrdersByMonth
    .filter(o => o.status !== 'Cancelled')
    .reduce((sum, o) => {
      const orderProfit = o.items.reduce((pr, it) => {
        return pr + (it.price - it.costPrice) * it.quantity;
      }, 0);
      return sum + orderProfit;
    }, 0);

  const metricsExpenses = filteredExpensesByMonth.reduce((sum, e) => sum + e.amount, 0);
  const metricsNetMargin = metricsProfit - metricsExpenses;

  const toggleProductEnabled = (p: Product) => {
    onEditProduct({
      ...p,
      enabled: !p.enabled
    });
  };

  // Handle Product Form Submit
  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.description) return;
    
    if (editingProdId) {
      onEditProduct({
        id: editingProdId,
        ...productForm
      } as Product);
      setEditingProdId(null);
    } else {
      onAddProduct({
        id: 'prod-' + Date.now(),
        ...productForm
      } as Product);
    }

    setShowProductForm(false);
    // Reset
    setProductForm({
      name: '',
      description: '',
      price: 150,
      costPrice: 60,
      category: 'Podi Varieties',
      images: ['https://images.unsplash.com/photo-1541832676-9b763b0239ab?q=80&w=600'],
      enabled: true,
      stock: 100,
      traditionalBenefit: '',
      weight: '500g',
      ingredients: ['Ghee', 'Organic Sugar / Jaggery', 'Gram Flour']
    });
  };

  const handleEditInit = (prod: Product) => {
    setEditingProdId(prod.id);
    setProductForm({
      name: prod.name,
      description: prod.description,
      price: prod.price,
      costPrice: prod.costPrice || Math.floor(prod.price * 0.45),
      category: prod.category,
      images: prod.images,
      enabled: prod.enabled,
      stock: prod.stock,
      traditionalBenefit: prod.traditionalBenefit || '',
      weight: prod.weight || '500g',
      ingredients: prod.ingredients || []
    });
    setShowProductForm(true);
  };

  // Handle Manual Expense Submit
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddExpense({
      id: 'exp-' + Date.now(),
      month: expenseForm.month,
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      description: expenseForm.description,
      date: new Date().toISOString()
    });
    setShowExpenseForm(false);
    setExpenseForm({
      month: '2026-05',
      category: 'Temple Ingredients',
      amount: 1500,
      description: ''
    });
  };

  // Preset Traditional Images for easy Admin Selection
  const IMAGE_PRESETS = [
    'https://images.unsplash.com/photo-1541832676-9b763b0239ab?q=80&w=400', // yellow sweet laddu
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=400', // Saffron sweet
    'https://images.unsplash.com/photo-1628102476695-814a35747617?q=80&w=400', // golden liquid ghee
    'https://images.unsplash.com/photo-1596797038530-2c107229654b?q=80&w=400', // spices seeds
    'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=400', // powder bowls
    'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?q=80&w=400', // pickle slice
  ];

  // If Admin is NOT logged in, show premium Login Form
  if (!isAdminLoggedIn) {
    return (
      <>
      <div className="admin-login-particles" aria-hidden="true">
        {Array.from({ length: 30 }, (_, i) => (
          <span
            key={i}
            className="admin-login-dot"
            style={{
              left: `${(i * 3.4 + 2) % 98}%`,
              ['--drift' as string]: `${(i % 2 === 0 ? 1 : -1) * (8 + (i % 20))}px`,
              animationDuration: `${12 + (i % 14)}s`,
              animationDelay: `${(i * 0.55) % 14}s`,
              width: `${2 + (i % 4)}px`,
              height: `${2 + (i % 4)}px`,
              opacity: 0.5 + (i % 5) * 0.1,
            }}
          />
        ))}
      </div>

      <div className="min-h-screen flex items-center justify-center px-4 relative z-10 admin-login-wrap">
      <div className="max-w-md w-full ab-card admin-login-card p-10 rounded-3xl space-y-8 text-white relative z-10">
        <div className="text-center space-y-2 relative z-10">
          <span className="text-3xl admin-key-icon">🔑</span>
          <h2 className="text-xl md:text-2xl font-serif font-black tracking-tight admin-section-title">
            AGRAHARA CONSOLE LOCK
          </h2>
          <p className="text-xs admin-section-sub font-sans">
            Authentication portal protecting heritage culinary databases.
          </p>
        </div>

        {loginError && (
          <div className="bg-[#1a1a1a] text-white border border-white/30 p-3 rounded-lg text-xs text-center font-sans relative z-10">
            {loginError}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4 text-xs font-sans ab-muted relative z-10">
          <div className="space-y-1">
            <label className="block ab-h-gold font-semibold">Administrator Username:</label>
            <input
              type="text"
              required
              value={adminUser.username}
              onChange={(e) => setAdminUser({ ...adminUser, username: e.target.value })}
              placeholder="e.g. admin"
              className="w-full p-2.5 ab-input rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="block ab-h-gold font-semibold">Database Passphrase / Pin:</label>
            <input
              type="password"
              required
              value={adminUser.password}
              onChange={(e) => setAdminUser({ ...adminUser, password: e.target.value })}
              placeholder="e.g. admin"
              className="w-full p-2.5 ab-input rounded-lg focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            className="w-full ab-btn-primary admin-btn-glow font-sans font-bold py-3 rounded-lg shadow-xs active:scale-[0.98] cursor-pointer uppercase tracking-wider text-xs"
          >
            DECRYPT & ACCESS REGISTRIES
          </button>
        </form>

        <p className="text-center text-[10.5px] ab-h-gold font-sans relative z-10">
          Authentication default credentials: <strong>admin</strong> / <strong>admin</strong>
        </p>
      </div>
      </div>
      </>
    );
  }

  return (
    <>
    <div className="admin-console-particles" aria-hidden="true">
      {Array.from({ length: 30 }, (_, i) => (
        <span
          key={i}
          className="admin-console-dot"
          style={{
            left: `${(i * 3.4 + 2) % 98}%`,
            ['--drift' as string]: `${(i % 2 === 0 ? 1 : -1) * (8 + (i % 20))}px`,
            animationDuration: `${12 + (i % 14)}s`,
            animationDelay: `${(i * 0.55) % 14}s`,
            width: `${2 + (i % 4)}px`,
            height: `${2 + (i % 4)}px`,
            opacity: 0.5 + (i % 5) * 0.1,
          }}
        />
      ))}
    </div>

    <div className="admin-layout animate-bloom text-white">
      <aside className="admin-sidebar no-print">
        <div className="admin-sidebar-brand">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center font-bold text-sm">AB</div>
            <div>
              <h2 className="admin-section-title text-sm leading-tight">AGRAHARA</h2>
              <p className="admin-section-sub">Admin Console</p>
            </div>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {ADMIN_NAV.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setAdminSubTab(tab.key)}
                className={`admin-sidebar-item ${adminSubTab === tab.key ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            type="button"
            onClick={() => setIsAdminLoggedIn(false)}
            className="admin-sidebar-item w-full"
          >
            🔒 Lock & Logout
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar no-print">
          <div>
            <h1 className="admin-section-title">{activeNavLabel}</h1>
            <p className="admin-section-sub">Click sidebar items to view each section one by one.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <div
              className={`flex items-center gap-2 text-[10px] font-sans px-2.5 py-1.5 rounded-lg border ${
                apiOnline
                  ? 'text-emerald-300 bg-emerald-950/30 border-emerald-800/50'
                  : 'text-red-300 bg-red-950/30 border-red-800/50'
              }`}
              title="Data is loaded via fetch to /api/* (proxied to backend port 4000)"
            >
              <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
              API {apiOnline ? 'connected' : 'offline'}
              {lastLoadedAt && (
                <span className="text-white/50">
                  · {lastLoadedAt.toLocaleTimeString()}
                </span>
              )}
            </div>
            {onReloadData && (
              <button
                type="button"
                onClick={onReloadData}
                disabled={reloading}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg border border-[#c9a227]/40 text-[#c9a227] hover:bg-[#c9a227]/10 disabled:opacity-50"
              >
                <RefreshCw size={12} className={reloading ? 'animate-spin' : ''} />
                {reloading ? 'Loading…' : 'Refresh API'}
              </button>
            )}
            <label className="flex items-center gap-2 font-sans text-xs ab-muted">
              <Calendar size={14} />
              <span>Month:</span>
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="ab-input rounded-lg py-1.5 px-3 text-xs font-bold cursor-pointer"
              >
                <option value="All">All months</option>
                {allMonths.map((mon) => (
                  <option key={mon} value={mon}>{mon}</option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <div className="admin-content" key={adminSubTab}>

      {/* SUB-VIEW 1: FINANCIAL CORE DASHBOARD */}
      {adminSubTab === 'dashboard' && (
        <div className="space-y-6 animate-bloom no-print">
          
          {/* Bento-grid metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Box A: Sales */}
            <div className="glass-card p-6 rounded-2xl shadow-lg flex items-center justify-between border-none">
              <div className="space-y-1">
                <span className="text-[10px] text-white/50 font-sans uppercase font-bold tracking-wider block">Gross Sales</span>
                <p className="text-xl md:text-2xl font-serif font-black text-white text-glow">₹ {metricsSales}</p>
                <span className="text-[10px] text-white/40 font-bold block">✓ Safe in Ashram Repo</span>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-full text-white">
                <TrendingUp size={20} />
              </div>
            </div>

            {/* Box B: Pure profit derived */}
            <div className="glass-card p-6 rounded-2xl shadow-lg flex items-center justify-between border-none">
              <div className="space-y-1">
                <span className="text-[10px] text-white/50 font-sans uppercase font-bold tracking-wider block">Calculated Profit</span>
                <p className="text-xl md:text-2xl font-serif font-black text-white text-glow">₹ {metricsProfit}</p>
                <p className="text-[9.5px] text-white/40">Based on sale price - cost price.</p>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-full text-white">
                <TrendingUp size={20} />
              </div>
            </div>

            {/* Box C: Manual Expense */}
            <div className="glass-card p-6 rounded-2xl shadow-lg flex items-center justify-between border-none">
              <div className="space-y-1">
                <span className="text-[10px] text-white/50 font-sans uppercase font-bold tracking-wider block">Supplies Expense</span>
                <p className="text-xl md:text-2xl font-serif font-black text-white text-glow">₹ {metricsExpenses}</p>
                <button 
                  onClick={() => setShowExpenseForm(true)}
                  className="text-[10px] text-white underline font-bold text-left block cursor-pointer hover:text-white/80 transition-colors"
                >
                  + Record Expense manually
                </button>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-full text-white">
                <TrendingUp size={20} className="rotate-180" />
              </div>
            </div>

            {/* Box D: Balance Net Margin */}
            <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-white/50 font-sans uppercase font-bold tracking-wider block">Net Ashram surplus</span>
                <p className={`text-xl md:text-2xl font-serif font-black text-white`}>
                  ₹ {metricsNetMargin}
                </p>
                <div className="text-[9.5px] text-white/40 font-sans">Profit minus Manual expenses.</div>
              </div>
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold text-white shadow-xs/20">
                🪙
              </div>
            </div>

          </div>

          {/* Graphical/text summary list for financial clarity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side: Month distribution info */}
            <div className="lg:col-span-2 admin-panel p-6 space-y-4">
              <h3 className="font-serif font-bold text-white text-base flex justify-between items-center border-b border-[#3a3a3a] pb-2">
                Order Financial Analytics
                <span className="bg-[#141414] border border-[#3a3a3a] font-mono text-[10px] px-2.5 py-1 rounded text-white font-bold">
                  Month selected: {selectedMonthFilter}
                </span>
              </h3>

              <div className="space-y-3 font-sans text-xs">
                {filteredOrdersByMonth.length === 0 ? (
                  <p className="text-white/60 text-center py-6">No order logs currently available inside selected month filter.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                    {filteredOrdersByMonth.map((ord) => (
                      <div key={ord.id} className="p-3 bg-[#141414] border border-[#3a3a3a] rounded-lg flex justify-between items-center gap-3">
                        <div>
                          <p className="font-bold text-white text-sm">{ord.customerName} ({ord.invoiceNumber})</p>
                          <span className="text-[10px] text-white/60 font-mono">{ord.orderDate.substring(0,10)} | status: <strong className="text-white">{ord.status}</strong></span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold font-mono text-white">₹{ord.totalPrice}</p>
                          <span className="text-[9.5px] text-white/60 font-sans font-bold">Profit: +₹{ord.items.reduce((sum,it)=> sum + (it.price-it.costPrice)*it.quantity, 0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Manual expense highlights */}
            <div className="admin-panel p-6 space-y-4 text-white">
              <div className="flex justify-between items-center border-b border-[#3a3a3a] pb-2">
                <h3 className="font-serif font-bold text-white text-sm">Active Monthly Expenses</h3>
                <button 
                  onClick={() => setShowExpenseForm(true)}
                  className="bg-white text-black hover:bg-[#d4d4d4] px-2.5 py-1 text-[10px] font-sans font-bold rounded-lg cursor-pointer transition-colors"
                >
                  + Add New
                </button>
              </div>

              <div className="space-y-3 font-sans text-xs h-60 overflow-y-auto max-h-64 scrollbar-none pr-2">
                {filteredExpensesByMonth.length > 0 ? (
                  filteredExpensesByMonth.map((exp) => (
                    <div key={exp.id} className="p-3 bg-[#141414] rounded-xl border border-[#3a3a3a] text-white flex justify-between items-start">
                      <div className="space-y-1">
                        <strong className="block text-white text-xs pb-0.5">{exp.category}</strong>
                        <span className="text-[9.5px] text-white/60 italic block leading-tight">{exp.description}</span>
                        <span className="text-[9.5px] bg-white/5 text-white px-1.5 py-0.5 rounded font-mono font-bold inline-block border border-white/10 mt-1">{exp.month}</span>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-red-600 font-mono text-sm">₹{exp.amount}</p>
                        <button 
                          onClick={() => onDeleteExpense(exp.id)}
                          className="text-[9.5px] text-white/60 hover:text-red-400 underline cursor-pointer font-bold block pt-1 ml-auto"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-white/60 text-center py-8 italic text-[11px]">No custom expenses specified for this month register.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SUB-VIEW 2: INVENTORY PRODUCT MANAGEMENT */}
      {adminSubTab === 'products' && (
        <div className="space-y-6 animate-bloom no-print">
          
          <div className="flex justify-between items-center">
            <h3 className="font-serif font-black text-white text-base md:text-lg">Traditional Product Catalog ({products.length} Items)</h3>
            <button
              onClick={() => {
                setEditingProdId(null);
                setProductForm({
                  name: '',
                  description: '',
                  price: 150,
                  costPrice: 65,
                  category: 'Podi Varieties',
                  images: ['https://images.unsplash.com/photo-1541832676-9b763b0239ab?q=80&w=600'],
                  enabled: true,
                  stock: 100,
                  traditionalBenefit: '',
                  weight: '250g',
                  ingredients: ['A2 Ghee', 'Dry Fruit']
                });
                setShowProductForm(true);
              }}
              className="bg-white hover:bg-black text-black hover:text-white font-sans font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 text-xs shadow-xs cursor-pointer transition-colors"
            >
              <Plus size={14} /> Add Traditional Product
            </button>
          </div>

          {/* DYNAMIC FORM OVERLAY */}
          {showProductForm && (
            <form onSubmit={handleProductSubmit} className="glass-card backdrop-blur-xs/30 p-6 rounded-3xl relative border border-white/20 space-y-4 shadow-md text-white">
              <h4 className="font-serif font-black text-white border-b border-white/10 pb-2 text-sm flex items-center gap-1.5 uppercase tracking-widest">
                <span>🍱</span> {editingProdId ? 'Modify Product Specifications' : 'Introduce New Food Product'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans text-white">
                
                {/* Name */}
                <div className="space-y-1">
                  <label className="font-semibold block text-white/70">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    placeholder="e.g. Traditional Puliyodarai Mix"
                    className="w-full p-2.5 border border-white/10 bg-white/5 text-white rounded-lg focus:outline-none focus:border-white"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="font-semibold block text-white">Store Category Listing *</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                    className="w-full p-2.5 border border-[#3a3a3a] bg-[#141414] text-white rounded-lg focus:outline-hidden focus:border-white font-bold"
                  >
                    <option value="Podi Varieties">Podi Varieties</option>
                    <option value="Pickle Varieties">Pickle Varieties</option>
                    <option value="Porridge Mix">Porridge Mix</option>
                    <option value="Instant Mix">Instant Mix</option>
                    <option value="Vathal Varieties">Vathal Varieties</option>
                  </select>
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <label className="font-semibold block text-white">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={productForm.price || ''}
                    onChange={(e) => setProductForm({...productForm, price: Number(e.target.value)})}
                    className="w-full p-2.5 border border-[#3a3a3a] bg-[#141414] text-white rounded-lg focus:outline-hidden focus:border-white"
                  />
                </div>

                {/* Cost Price */}
                <div className="space-y-1">
                  <label className="font-semibold block flex items-center justify-between text-white">
                    <span>Raw Material Cost Price (₹) *</span>
                    <span className="text-[9.5px] text-white tracking-normal font-sans italic font-bold">(For Profit Metric)</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={productForm.costPrice || ''}
                    onChange={(e) => setProductForm({...productForm, costPrice: Number(e.target.value)})}
                    className="w-full p-2.5 border border-[#3a3a3a] bg-[#141414] text-white rounded-lg focus:outline-hidden focus:border-white"
                  />
                </div>

                {/* Weight */}
                <div className="space-y-1">
                  <label className="font-semibold block text-white">Net Pack Weight (e.g., 250g, 500ml)</label>
                  <input
                    type="text"
                    value={productForm.weight}
                    onChange={(e) => setProductForm({...productForm, weight: e.target.value})}
                    placeholder="e.g. 500g"
                    className="w-full p-2.5 border border-[#3a3a3a] bg-[#141414] text-white rounded-lg focus:outline-hidden focus:border-white"
                  />
                </div>

                {/* Stock */}
                <div className="space-y-1">
                  <label className="font-semibold block text-white">Available Stock *</label>
                  <input
                    type="number"
                    required
                    value={productForm.stock || ''}
                    onChange={(e) => setProductForm({...productForm, stock: Number(e.target.value)})}
                    className="w-full p-2.5 border border-[#3a3a3a] bg-[#141414] text-white rounded-lg focus:outline-hidden focus:border-white"
                  />
                </div>

                {/* Images Config */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold block flex justify-between text-white">
                    <span>Configure Multiple Image URLs *</span>
                    <span className="text-[9.5px] text-white/60 font-sans italic">(Separate with commas)</span>
                  </label>
                  
                  <textarea
                    rows={2}
                    required
                    value={productForm.images.join(', ')}
                    onChange={(e) => setProductForm({
                      ...productForm, 
                      images: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    className="w-full p-2.5 border border-[#3a3a3a] bg-[#141414] text-white rounded-lg font-mono text-[10px] focus:outline-hidden focus:border-white"
                  />

                  {/* Preset Selector to help testing */}
                  <div className="pt-2">
                    <p className="text-[10px] text-white/60 font-sans pb-1.5 font-semibold">Or select a preset traditional food image to insert:</p>
                    <div className="flex gap-2 flex-wrap">
                      {IMAGE_PRESETS.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (!productForm.images.includes(img)) {
                              setProductForm({ ...productForm, images: [...productForm.images, img] });
                            }
                          }}
                          className="w-10 h-10 rounded-lg border border-[#3a3a3a] overflow-hidden hover:border-white active:scale-95 transition-all p-0.5 cursor-pointer bg-white"
                        >
                          <img src={img} className="w-full h-full object-cover rounded-xs" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interactive base64 direct disk uploader */}
                  <div className="mt-3.5 p-4 rounded-xl border-2 border-dashed border-[#3a3a3a] bg-[#141414] text-center relative">
                    <input 
                      type="file" 
                      id="upload-base64-multiple"
                      multiple
                      accept="image/*"
                      onChange={handleLocalImageUpload}
                      className="hidden"
                    />
                    <label 
                      htmlFor="upload-base64-multiple"
                      className="inline-flex items-center gap-2 bg-white hover:bg-[#d4d4d4] text-black font-sans font-bold py-2 px-4 rounded-lg text-xs cursor-pointer select-none transition-all shadow-xs"
                    >
                      📷 Choose & Convert Prasad Images
                    </label>
                    <p className="text-[9.5px] text-white/60 mt-2 font-sans leading-relaxed">
                      Selected images convert immediately to local Base64 Data-URLs securely. Multiple uploads are supported!
                    </p>
                    
                    {productForm.images.length > 0 && (
                      <div className="mt-3.5 pt-3.5 border-t border-[#3a3a3a] flex flex-wrap gap-2.5 justify-center">
                        {productForm.images.map((img, idx) => (
                          <div key={idx} className="relative group w-12 h-12 rounded-lg border border-[#3a3a3a] overflow-hidden bg-white shadow-inner">
                            <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={() => {
                                setProductForm({
                                  ...productForm,
                                  images: productForm.images.filter((_, subIdx) => subIdx !== idx)
                                });
                              }}
                              className="absolute inset-0 bg-black/75 text-white font-bold text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer animate-bloom"
                              title="Delete this image"
                            >
                              ❌
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Herb details */}
                <div className="space-y-1">
                  <label className="font-semibold block text-white">Traditional Wellness Benefit</label>
                  <input
                    type="text"
                    value={productForm.traditionalBenefit}
                    onChange={(e) => setProductForm({...productForm, traditionalBenefit: e.target.value})}
                    placeholder="e.g. Cools pitta or enhances digestive Agni"
                    className="w-full p-2.5 border border-[#3a3a3a] bg-[#141414] text-white rounded-lg focus:outline-hidden focus:border-white"
                  />
                </div>

                {/* Enable toggle */}
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="checkbox-enabled"
                    checked={productForm.enabled}
                    onChange={(e) => setProductForm({...productForm, enabled: e.target.checked})}
                    className="w-4 h-4 cursor-pointer accent-white"
                  />
                  <label htmlFor="checkbox-enabled" className="font-bold text-white cursor-pointer font-sans text-xs">
                    Enable Product (Show to Public Store)
                  </label>
                </div>

              </div>

              {/* Form Desc */}
              <div className="space-y-1 text-xs">
                <label className="font-semibold block text-white">Detailed Recipe & Background Description *</label>
                <textarea
                  rows={2}
                  required
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                  className="w-full p-2.5 border border-[#3a3a3a] bg-[#141414] text-white rounded-lg focus:outline-hidden focus:border-white"
                />
              </div>

              <div className="flex gap-2 pt-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowProductForm(false)}
                  className="px-4 py-2 border border-[#3a3a3a] text-white/60 hover:text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-white hover:bg-[#d4d4d4] text-black font-sans font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
                >
                  {editingProdId ? 'Save Specs Updates' : 'Publish Product'}
                </button>
              </div>

            </form>
          )}

          {/* List layout inside admin panel */}
          <div className="bg-[#141414] backdrop-blur-xs rounded-2xl border border-[#3a3a3a] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-sans text-white">
                <thead>
                  <tr className="bg-[#141414] border-b border-[#3a3a3a] text-white tracking-wider text-[11px] uppercase">
                    <th className="p-4 font-bold">Image</th>
                    <th className="p-4 font-bold">Product Details</th>
                    <th className="p-4 font-bold">Category</th>
                    <th className="p-4 text-right font-bold">Selling Price</th>
                    <th className="p-4 text-right font-bold">Cost Price</th>
                    <th className="p-4 text-center font-bold">Stock</th>
                    <th className="p-4 text-center font-bold">Status</th>
                    <th className="p-4 text-center font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a3a3a] text-white">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="p-4 relative w-20">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#3a3a3a] relative">
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          {p.images.length > 1 && (
                            <span className="absolute -top-1 -right-1 bg-white text-black border border-white text-[8px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                              {p.images.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 max-w-xs">
                        <strong className="text-white text-[13px] block font-serif font-black">{p.name}</strong>
                        <span className="text-white/60 text-[10px] block truncate max-w-sm mb-1">{p.description}</span>
                        {p.weight && <span className="text-[9.5px] bg-[#141414] text-white px-1.5 py-0.5 rounded-md font-mono border border-[#3a3a3a] font-bold">📦 {p.weight}</span>}
                      </td>
                      <td className="p-4 text-white/60 font-medium">{p.category}</td>
                      <td className="p-4 text-right font-black text-white font-mono text-xs">₹{p.price}</td>
                      <td className="p-4 text-right text-white/60 font-mono text-xs">₹{p.costPrice || 0}</td>
                      <td className="p-4 text-center font-bold font-mono text-xs text-white">{p.stock}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleProductEnabled(p)}
                          className={`px-2.5 py-1 text-[10px] rounded-lg border font-bold cursor-pointer transition-colors ${
                            p.enabled 
                              ? 'bg-white text-black border-white' 
                              : 'bg-[#262626] text-white/60 border-[#505050]'
                          }`}
                        >
                          {p.enabled ? '● Active' : '○ Hidden'}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1.5 justify-center">
                          <button
                            onClick={() => handleEditInit(p)}
                            className="text-white hover:text-white p-1.5 bg-[#141414] border border-[#3a3a3a] rounded-lg hover:scale-105 transition-transform cursor-pointer"
                            title="Edit specs"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => onDeleteProduct(p.id)}
                            className="text-red-700 hover:text-red-800 p-1.5 bg-[#141414] border border-[#3a3a3a] rounded-lg hover:scale-105 transition-transform cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUB-VIEW 3: CUSTOMER ORDERS LIST */}
      {adminSubTab === 'orders' && (
        <div className="space-y-6 animate-bloom no-print text-white">
          <div className="text-left">
            <h3 className="font-serif font-black text-white text-md md:text-lg">Customer Registers ({orders.length} Records)</h3>
            <p className="text-xs text-white/60 font-sans">Verify regional thali parcels, adjust delivery status and prompt tax receipts.</p>
          </div>

          <div className="bg-[#141414] backdrop-blur-xs rounded-2xl border border-[#3a3a3a] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-sans text-white">
                <thead>
                  <tr className="bg-[#141414] border-b border-[#3a3a3a] text-white tracking-wider text-[11px] uppercase font-bold">
                    <th className="p-4">Invoice ID</th>
                    <th className="p-4">Customer Info</th>
                    <th className="p-4 text-center">Payment Selected</th>
                    <th className="p-4 text-right">Total Price</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Order Date</th>
                    <th className="p-4 text-center">Tax Bill</th>
                    <th className="p-4 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a3a3a] text-white/70">
                  {filteredOrdersByMonth.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="p-4 font-mono font-bold text-white">{ord.invoiceNumber}</td>
                      <td className="p-4 max-w-xs">
                        <strong className="text-white block">{ord.customerName}</strong>
                        <span className="text-[10px] text-white/60 block truncate">{ord.customerEmail} | WhatsApp: {ord.customerPhone}</span>
                        <div className="text-[9.5px] italic text-white/60 block truncate mt-0.5">Address: {ord.customerAddress}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-[#141414] text-white border border-[#3a3a3a] px-2 py-0.5 rounded font-mono font-bold">
                          {ord.paymentMethod}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-white text-sm">₹{ord.totalPrice}</td>
                      <td className="p-4 text-center">
                        <select
                          value={ord.status}
                          onChange={(e) => onChangeOrderStatus(ord.id, e.target.value as OrderStatus)}
                          className={`text-xs font-bold rounded-lg px-2.5 py-1 border cursor-pointer ${
                            ord.status === 'Delivered' ? 'bg-white text-black border-white' :
                            ord.status === 'Pending' ? 'bg-[#262626] text-white border-[#505050]' :
                            ord.status === 'Dispatched' ? 'bg-indigo-100 text-indigo-900 border-indigo-400' :
                            'bg-[#1a1a1a] text-white/60 border-[#404040]'
                          }`}
                        >
                          <option value="Pending" className="bg-white text-black">Pending</option>
                          <option value="Dispatched" className="bg-white text-black">Dispatched</option>
                          <option value="Delivered" className="bg-white text-black">Delivered</option>
                          <option value="Cancelled" className="bg-white text-black">Cancelled</option>
                        </select>
                      </td>
                      <td className="p-4 text-center text-white/60 font-mono text-[10.5px]">
                        {new Date(ord.orderDate).toLocaleString().substring(0, 16)}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedInvoiceOrder(ord)}
                          className="bg-[#141414] text-white hover:bg-white hover:text-black border border-[#3a3a3a] p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[10.5px] font-bold mx-auto shadow-xs"
                          title="Generate Tax Invoice"
                        >
                          <FileText size={12} /> Tax Invoice
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => onDeleteOrder(ord.id)}
                          className="text-white/60 hover:text-red-400 hover:bg-[#1a1a1a] p-1.5 rounded hover:scale-105 transition-transform cursor-pointer border border-transparent hover:border-[#404040]"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: MANUAL EXPENSES */}
      {adminSubTab === 'expenses' && (
        <div className="space-y-6 animate-bloom no-print text-white">
          <div className="flex justify-between items-center">
            <h3 className="font-serif font-black text-white text-base md:text-lg">Ashram Manual Expenses ({expenses.length} Records)</h3>
            <button
              onClick={() => setShowExpenseForm(true)}
              className="bg-white hover:bg-[#d4d4d4] text-black font-sans font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 text-xs shadow-xs cursor-pointer transition-colors"
            >
              <Plus size={14} /> Record Manual Expense
            </button>
          </div>

          {showExpenseForm && (
            <form onSubmit={handleExpenseSubmit} className="bg-[#141414] backdrop-blur-xs/30 p-6 rounded-2xl relative border border-white/20 space-y-4 shadow-md text-white">
              <h4 className="font-serif font-black text-white border-b border-[#3a3a3a] pb-1 text-sm">
                🖋️ Record supplies or ingredients expenses manual
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                <div className="space-y-1">
                  <label className="text-white font-semibold block">Month Period (YYYY-MM) *</label>
                  <input 
                    type="month"
                    required
                    value={expenseForm.month}
                    onChange={(e) => setExpenseForm({ ...expenseForm, month: e.target.value })}
                    className="w-full p-2.5 bg-[#141414] border border-[#3a3a3a] rounded-lg text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-white font-semibold block">Category *</label>
                  <select 
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full p-2.5 bg-[#141414] border border-[#3a3a3a] rounded-lg text-white font-bold"
                  >
                    <option value="Temple Ingredients">Temple Ingredients</option>
                    <option value="Packaging Materials">Packaging Materials</option>
                    <option value="Ashram Logistics">Ashram Logistics</option>
                    <option value="Kitchen Helper Salaries">Kitchen Helper Salaries</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-white font-semibold block">Amount (₹) *</label>
                  <input 
                    type="number"
                    required
                    value={expenseForm.amount || ''}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#141414] border border-[#3a3a3a] rounded-lg text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-white font-semibold block">Description Detail *</label>
                  <input 
                    type="text"
                    required
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    placeholder="e.g. Cardamom spices bulk purchase"
                    className="w-full p-2.5 bg-[#141414] border border-[#3a3a3a] rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowExpenseForm(false)}
                  className="px-4 py-2 border border-[#3a3a3a] text-white/60 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-white text-black hover:bg-[#d4d4d4] rounded-lg font-sans font-bold"
                >
                  Save Expense Log
                </button>
              </div>

            </form>
          )}

          <div className="bg-[#141414] backdrop-blur-xs rounded-2xl border border-[#3a3a3a] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-sans text-white">
                <thead>
                  <tr className="bg-[#141414] border-b border-[#3a3a3a] text-white tracking-wider text-[11px] uppercase font-bold">
                    <th className="p-4">Period</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Description</th>
                    <th className="p-4 text-right">Amount (₹)</th>
                    <th className="p-4 text-center">Recorded Date</th>
                    <th className="p-4 text-center font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a3a3a] text-white/70">
                  {filteredExpensesByMonth.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="p-4 font-mono font-bold text-white">{exp.month}</td>
                      <td className="p-4 font-bold text-white">{exp.category}</td>
                      <td className="p-4 font-serif">{exp.description}</td>
                      <td className="p-4 text-right font-black text-white text-sm">₹ {exp.amount}</td>
                      <td className="p-4 text-center text-white/60 text-[10.5px]">
                        {new Date(exp.date).toLocaleString().substring(0, 16)}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => onDeleteExpense(exp.id)}
                          className="text-red-700 hover:text-red-800 hover:underline cursor-pointer font-bold"
                        >
                          delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredExpensesByMonth.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-white/60 italic text-xs">No manual expenses stored inside active filters limit.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUB-VIEW 5: PUBLIC ENQUIRIES & MESSAGES */}
      {adminSubTab === 'messages' && (
        <div className="space-y-6 animate-bloom no-print text-white">
          <div className="text-left">
            <h3 className="font-serif font-black text-white text-base md:text-lg">Public Queries ({contactMessages.length} Messages)</h3>
            <p className="text-xs text-white/60 font-sans">Public reviews or customized traditional thale requests captured securely.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contactMessages.map((msg) => (
              <div 
                key={msg.id} 
                className={`bg-[#141414] backdrop-blur-xs p-5 rounded-2xl border transition-all space-y-4 shadow-xs relative overflow-hidden ${
                  msg.resolved ? 'border-[#3a3a3a] opacity-80' : 'border-white/30 ring-1 ring-white/20'
                }`}
              >
                {!msg.resolved && <div className="absolute top-0 left-0 right-0 h-1 bg-white" />}
                
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-bold text-white text-sm">{msg.name}</h4>
                    <p className="text-[10px] text-white/60 font-mono leading-tight">{msg.email} | whatsapp: {msg.phone || 'not configured'}</p>
                    <p className="text-[11.5px] font-bold text-white pt-1 font-serif">Subject: {msg.subject}</p>
                  </div>

                  <span className={`text-[9px] font-sans px-2 py-0.5 rounded-lg border font-bold ${
                    msg.resolved ? 'bg-[#1a1a1a] text-white/60 border-[#404040]' : 'bg-white text-black border-white'
                  }`}>
                    {msg.resolved ? 'Resolved' : 'Active Query'}
                  </span>
                </div>

                <p className="text-xs text-white/60 leading-relaxed font-sans bg-[#141414] p-3 rounded-lg border border-[#3a3a3a] whitespace-pre-wrap">
                  {msg.message}
                </p>

                <div className="pt-2 border-t border-[#3a3a3a] flex justify-between items-center text-[10.5px]">
                  <span className="text-white font-mono">{new Date(msg.date).toLocaleDateString()}</span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => onToggleMessageResolved(msg.id)}
                      className="text-white/70 hover:underline font-bold text-[10px] cursor-pointer flex items-center gap-1 bg-[#141414] border border-[#3a3a3a] px-2 py-1 rounded-lg"
                    >
                      {msg.resolved ? '✓ Reopen Query' : '✓ Resolve Ticket'}
                    </button>
                    <button
                      onClick={() => onDeleteMessage(msg.id)}
                      className="text-red-400 hover:text-red-300 hover:underline font-bold text-[10px] cursor-pointer"
                    >
                      delete
                    </button>
                  </div>
                </div>

              </div>
            ))}
            {contactMessages.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-[#3a3a3a] shadow-xs text-xs">
                🍃 No messages received yet from public forms. Explore catalog details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 6: GATEWAYS CONFIGS */}
      {adminSubTab === 'configs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-bloom no-print text-white">
          
          {/* SMTP configurations */}
          <div className="bg-[#141414] backdrop-blur-xs p-6 rounded-2xl border border-[#3a3a3a] shadow-xs space-y-4 text-xs font-sans">
            <h3 className="font-serif font-black text-white border-b border-[#3a3a3a] pb-2 text-sm flex items-center gap-2">
              <span>📧</span> SMTP Invoice Mail Host Credentials
            </h3>

            <p className="text-[10px] text-white/60 leading-relaxed">
              Gmail: use your email + a 16-character App Password. Order invoices are sent automatically when customers checkout.
            </p>

            {smtpDraft.envConfigured && (
              <div className="text-[10px] text-sky-200 bg-sky-950/40 border border-sky-800/50 rounded-lg p-3 font-sans leading-relaxed">
                <strong>backend/.env is active.</strong> SMTP user/password come from the backend `.env` file (not this form). Update <code>SMTP_PASS</code> there with a new Gmail App Password, save, and the backend will restart.
              </div>
            )}

            {smtpDraft.smtpReady ? (
              <div className="text-[10px] text-emerald-200 bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-3 font-sans">
                ✓ SMTP ready — order confirmation emails will send automatically.
              </div>
            ) : (
              <div className="text-[10px] text-amber-200 bg-amber-950/40 border border-amber-800/50 rounded-lg p-3 font-sans leading-relaxed">
                <strong>SMTP not ready.</strong>{' '}
                {smtpDraft.lastError ||
                  'Set Gmail + App Password in backend/.env or below, then Save SMTP and use Send Test Email.'}
              </div>
            )}

            <div className="space-y-3 font-mono">
              <div className="space-y-1 font-sans">
                <label className="text-white font-semibold block">SMTP Host URI Node:</label>
                <input 
                  type="text"
                  value={smtpDraft.host}
                  onChange={(e) => setSmtpDraft(prev => ({ ...prev, host: e.target.value }))}
                  className="w-full p-2 bg-[#141414] border border-[#3a3a3a] rounded-lg font-bold text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-white/60 block">SMTP Port :</label>
                  <input 
                    type="number"
                    value={smtpDraft.port}
                    onChange={(e) => setSmtpDraft(prev => ({ ...prev, port: Number(e.target.value) }))}
                    className="w-full p-2 bg-[#141414] border border-[#3a3a3a] rounded-lg font-bold text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-white/60 block">SSL Verification Secure:</label>
                  <select 
                    value={smtpDraft.secure ? 'true' : 'false'}
                    onChange={(e) => setSmtpDraft(prev => ({ ...prev, secure: e.target.value === 'true' }))}
                    className="w-full p-2 bg-[#141414] border border-[#3a3a3a] rounded-lg font-bold text-white"
                  >
                    <option value="true">YES / SSL (465)</option>
                    <option value="false">NO / TLS (587)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">Sender Registered Email Account:</label>
                <input 
                  type="email"
                  value={smtpDraft.senderEmail}
                  onChange={(e) => setSmtpDraft(prev => ({ ...prev, senderEmail: e.target.value }))}
                  className="w-full p-2 bg-[#141414] border border-[#3a3a3a] rounded-lg font-bold text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">SMTP Authorization Username:</label>
                <input 
                  type="text"
                  value={smtpDraft.username}
                  onChange={(e) => setSmtpDraft(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full p-2 bg-[#141414] border border-[#3a3a3a] rounded-lg font-bold text-white"
                  placeholder="admin@agraharabhojanam.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">App Password {smtpDraft.hasPassword ? '(saved — leave blank to keep)' : '(required)'}:</label>
                <input 
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  className="w-full p-2 bg-[#141414] border border-[#3a3a3a] rounded-lg font-bold text-white"
                  placeholder="Gmail 16-character app password"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={smtpSaving}
                  onClick={async () => {
                    setSmtpSaving(true);
                    setSmtpTestStatus('');
                    try {
                      const sender = smtpDraft.senderEmail.trim();
                      const updated = await api.updateSMTP({
                        ...smtpDraft,
                        username: smtpDraft.username.trim() || sender,
                        senderEmail: sender,
                        ...(smtpPassword.trim() ? { password: smtpPassword.trim() } : {}),
                      });
                      onUpdateSMTP(updated);
                      setSmtpDraft((prev) => ({ ...prev, ...updated }));
                      setSmtpPassword('');
                      setSmtpTestStatus(
                        updated.smtpReady
                          ? 'SMTP saved and ready.'
                          : updated.lastError || 'Saved, but SMTP verify failed — check Gmail App Password in backend/.env.',
                      );
                    } catch (err) {
                      setSmtpTestStatus(err instanceof Error ? err.message : 'Could not save SMTP.');
                    } finally {
                      setSmtpSaving(false);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-[#c9a227] text-[#141414] font-bold text-[11px] uppercase disabled:opacity-60"
                >
                  {smtpSaving ? 'Saving…' : 'Save SMTP'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setSmtpTestStatus('');
                    try {
                      const result = await api.testSMTP(smtpDraft.senderEmail);
                      setSmtpTestStatus(`Test email sent to ${result.sentTo}`);
                    } catch (err) {
                      setSmtpTestStatus(err instanceof Error ? err.message : 'Test email failed.');
                    }
                  }}
                  className="px-4 py-2 rounded-lg border border-[#c9a227]/50 text-[#c9a227] font-bold text-[11px] uppercase"
                >
                  Send Test Email
                </button>
              </div>

              {smtpTestStatus && (
                <p className="text-[10px] text-white/80 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-2.5 font-sans">
                  {smtpTestStatus}
                </p>
              )}

              <div className="bg-[#141414] text-white/70 p-3 rounded font-sans italic text-[11px] leading-relaxed border border-[#3a3a3a]">
                When a customer places an order, invoice email is sent automatically to their email via <code>{smtpDraft.host || 'smtp.gmail.com'}</code>.
              </div>

            </div>

          </div>

          {/* WhatsApp API routing settings */}
          <div className="bg-[#141414] backdrop-blur-xs p-6 rounded-2xl border border-[#3a3a3a] shadow-xs space-y-4 text-xs font-sans">
            <h3 className="font-serif font-black text-white border-b border-[#3a3a3a] pb-2 text-sm flex items-center gap-2">
              <span>💬</span> WhatsApp Business & Routing Gateway
            </h3>

            <p className="text-[10px] text-white/60 leading-relaxed">
              Define the WhatsApp API message behaviors. Toggle between web direct client routing (free, click to send via prefilled text URL) or premium automated routing setups.
            </p>

            <div className="space-y-3 font-mono">
              <div className="space-y-1">
                <label className="text-white font-semibold block">Direct Store Owner Callback (Phone):</label>
                <input 
                  type="text"
                  value={whatsappConfig.recipientNumber}
                  onChange={(e) => onUpdateWhatsApp({ ...whatsappConfig, recipientNumber: e.target.value })}
                  className="w-full p-2 bg-[#141414] border border-[#3a3a3a] rounded-lg font-bold text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white font-semibold block">API Integration Routing Mode:</label>
                <select 
                  value={whatsappConfig.routingMode}
                  onChange={(e) => onUpdateWhatsApp({ ...whatsappConfig, routingMode: e.target.value as any })}
                  className="w-full p-2 bg-[#141414] border border-[#3a3a3a] rounded-lg font-bold text-white"
                >
                  <option value="DirectWeb">Direct Web Redirect Pre-filled Link (Free)</option>
                  <option value="CloudAPI">WhatsApp Cloud API (Requires Token)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">Cloud API Business Access Token:</label>
                <input 
                  type="password"
                  value={whatsappConfig.apiKey}
                  onChange={(e) => onUpdateWhatsApp({ ...whatsappConfig, apiKey: e.target.value })}
                  placeholder="Secret Cloud Token Key"
                  className="w-full p-2 bg-[#141414] border border-[#3a3a3a] rounded-lg text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">Facebook Phone ID Account Index:</label>
                <input 
                  type="text"
                  value={whatsappConfig.phoneId}
                  onChange={(e) => onUpdateWhatsApp({ ...whatsappConfig, phoneId: e.target.value })}
                  className="w-full p-2 bg-[#141414] border border-[#3a3a3a] rounded-lg font-bold text-white text-xs"
                />
              </div>

              <div className="admin-info-box p-3 rounded font-serif italic text-[11px] leading-relaxed">
                💎 <strong>WhatsApp routing behavior:</strong> Direct Web redirect builds immediate <code>wa.me/</code> pre-filled anchor links with orders list summary securely!
              </div>

            </div>

          </div>

        </div>
      )}

        </div>
      </div>

      {selectedInvoiceOrder && (
        <div className="invoice-modal-overlay ab-invoice-overlay fixed inset-0 z-55 flex overflow-y-auto animate-fade-in">
          <div className="invoice-modal-shell ab-invoice-shell p-4 md:p-5 space-y-4 relative text-left my-auto">
            <div id="tax-invoice-printable-doc" className="ab-invoice-doc">
              <div className="ab-invoice-brand-band">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <p className="ab-invoice-brand-tag mb-1">Royal Traditional Foods · Madurai</p>
                    <h3 className="ab-invoice-brand-title">Agrahara Bhojanam</h3>
                    <p className="text-[0.65rem] text-[#e8d48b]/85 mt-1 max-w-sm">
                      Temple Road, Srirangam, Madurai, Tamil Nadu 625001<br />
                      admin@agraharabhojanam.com · +91 87784 47165
                    </p>
                    <span className="ab-invoice-fssai">FSSAI 22421008000213</span>
                  </div>
                  <div className="ab-invoice-meta-box sm:text-right w-full sm:w-auto">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#d4a017] mb-1">Tax Invoice</p>
                    <p className="text-[0.68rem] text-[#f5e6b8]/90 leading-relaxed font-mono">
                      No: <strong className="text-white">{selectedInvoiceOrder.invoiceNumber}</strong><br />
                      Date: <strong className="text-white">{new Date(selectedInvoiceOrder.orderDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</strong><br />
                      Place of Supply: <strong className="text-white">Tamil Nadu (33)</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="ab-invoice-body">
                <div className="ab-invoice-party-grid">
                  <div className="ab-invoice-party-card">
                    <p className="ab-invoice-party-label">Bill To</p>
                    <strong className="block font-serif text-[#4a1e1e] text-sm mb-1">{selectedInvoiceOrder.customerName}</strong>
                    <p className="text-[0.68rem] text-[#6b5b4f] leading-relaxed">
                      {selectedInvoiceOrder.customerEmail}<br />
                      {selectedInvoiceOrder.customerPhone}
                    </p>
                  </div>
                  <div className="ab-invoice-party-card">
                    <p className="ab-invoice-party-label">Ship To</p>
                    <p className="text-[0.68rem] text-[#4a3728] whitespace-pre-wrap leading-relaxed">
                      {selectedInvoiceOrder.customerAddress}
                    </p>
                  </div>
                </div>

                <div className="ab-invoice-table-wrap">
                  <table className="ab-invoice-table">
                    <thead>
                      <tr>
                        <th className="text-center w-10">#</th>
                        <th>Item Description</th>
                        <th className="text-center w-20">HSN</th>
                        <th className="text-right w-16">Rate</th>
                        <th className="text-center w-12">Qty</th>
                        <th className="text-right w-20">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoiceOrder.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="text-center text-[#8a7568]">{idx + 1}</td>
                          <td className="ab-invoice-item-name">{it.productName}</td>
                          <td className="text-center font-mono text-[#8a7568]">21069099</td>
                          <td className="text-right font-mono">₹{it.price}</td>
                          <td className="text-center font-mono font-semibold">{it.quantity}</td>
                          <td className="text-right font-mono font-semibold">₹{it.price * it.quantity}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={4} className="text-right text-[#8a7568]">CGST (2.5% included)</td>
                        <td className="text-center">—</td>
                        <td className="text-right font-mono text-[#8a7568]">Incl.</td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="text-right text-[#8a7568]">SGST (2.5% included)</td>
                        <td className="text-center">—</td>
                        <td className="text-right font-mono text-[#8a7568]">Incl.</td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="text-right text-[#8a7568]">Shipping</td>
                        <td className="text-center">—</td>
                        <td className="text-right font-mono font-semibold text-[#1b4332]">FREE</td>
                      </tr>
                      <tr className="ab-invoice-total-row">
                        <td colSpan={4} className="text-right font-serif uppercase tracking-wide text-sm">Grand Total</td>
                        <td className="text-center">—</td>
                        <td className="text-right font-mono ab-invoice-grand">₹{selectedInvoiceOrder.totalPrice}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="ab-invoice-footer-grid">
                  <div className="ab-invoice-declaration">
                    <p className="font-bold text-[#4a1e1e] uppercase tracking-wide text-[0.58rem] mb-1">Declaration</p>
                    <p className="italic">
                      We certify that the particulars above are true and correct. All items are pure vegetarian,
                      handcrafted in our agraharam kitchen without preservatives.
                    </p>
                    <div className="mt-3 pt-2 border-t border-[#f0e6d8] grid grid-cols-3 gap-2 text-[0.58rem]">
                      <div>
                        <span className="text-[#8a7568] block uppercase">Status</span>
                        <span className={`ab-invoice-status-badge inline-block mt-0.5 border ${getInvoiceRoyalStatusClass(selectedInvoiceOrder.status)}`}>
                          {selectedInvoiceOrder.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8a7568] block uppercase">Payment</span>
                        <strong className={`block mt-0.5 ${getPaymentStatusClass(selectedInvoiceOrder.paymentStatus)}`}>
                          {getPaymentStatusLabel(selectedInvoiceOrder.paymentStatus)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#8a7568] block uppercase">Method</span>
                        <strong className="block mt-0.5 text-[#4a1e1e]">{selectedInvoiceOrder.paymentMethod}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center sm:items-end text-center sm:text-right">
                    <div className="ab-invoice-stamp">
                      <span className="text-base">👑</span>
                      <span>Pure Veg</span>
                    </div>
                    <p className="text-[0.58rem] font-bold text-[#4a1e1e] uppercase tracking-wider mt-2">Authorized Signatory</p>
                    <p className="text-[0.55rem] text-[#8a7568]">Agrahara Bhojanam Kitchens</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="ab-invoice-actions flex flex-wrap gap-2 justify-between items-center no-print">
              <span className="text-[0.65rem] text-[#8a7568] font-medium flex items-center gap-1">
                <ShieldCheck size={12} className="text-[#1b4332]" /> Secure e-Invoice
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSelectedInvoiceOrder(null)} className="ab-invoice-btn ab-invoice-btn-cancel">
                  Cancel
                </button>
                <button type="button" onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="ab-invoice-btn ab-invoice-btn-download disabled:opacity-50 flex items-center gap-1.5">
                  <Download size={13} /> {isGeneratingPDF ? 'Generating…' : 'Download PDF'}
                </button>
                <button type="button" onClick={handlePrintInvoice} className="ab-invoice-btn ab-invoice-btn-print flex items-center gap-1.5">
                  <Printer size={13} /> Print
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
    </>
  );
}
