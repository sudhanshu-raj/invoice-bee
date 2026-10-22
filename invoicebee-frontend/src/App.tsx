import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { User, getToken, getStoredUser, signup, signin, fetchCurrentUser, logout, createShop, updateShop, fetchCurrentShop, createTeamUser, fetchTeamUsers } from "./services/auth";
import { scanInvoiceFile, savePurchaseInvoice, ProductMatchDto, SavePurchaseInvoicePayload, PurchaseInvoiceDto, fetchPurchaseInvoices, fetchPurchaseInvoiceById, fetchInvoiceFileBlob, PurchaseInvoiceDetailDto, DuplicateInvoiceError, DuplicateInvoiceConflictDetails } from "./services/invoice";
import { ProductDetail, fetchShopProducts, createProduct, deleteProduct, deleteProductsBatch } from "./services/product";
import { SupplierSummary, fetchSuppliers, createSupplier } from "./services/supplier";
import { enrichProductWeb, ProductWebIntelligence } from "./services/intelligence";
import { QrCodeModal } from "./components/QrCodeModal";
import { QrScannerModal } from "./components/QrScannerModal";
import { ProductPriceModal } from "./components/ProductPriceModal";
import { BarcodePrintModal, PrintQueueItem } from "./components/BarcodePrintModal";
import { InvoiceScanningOverlay } from "./components/InvoiceScanningOverlay";

type IconName =
  | "grid" | "box" | "tag" | "scan" | "cart" | "sale" | "users" | "spark"
  | "archive" | "refresh" | "chat" | "report" | "settings" | "search"
  | "bell" | "chevron" | "arrow" | "trend" | "warning" | "check" | "plus"
  | "upload" | "filter" | "more" | "close" | "edit" | "file" | "send" | "menu" | "trash";

const iconPaths: Record<IconName, string> = {
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  box: "m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7M12 11v10",
  tag: "M20 12 12 20l-9-9V4h7l10 8ZM7.5 8h.01",
  scan: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 12h8",
  cart: "M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 8H6M10 20h.01M17 20h.01",
  sale: "M4 19V9M10 19V5M16 19v-7M22 19H2",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  spark: "m12 3-1.4 4.1L7 9l3.6 1.9L12 15l1.4-4.1L17 9l-3.6-1.9L12 3ZM5 15l-.8 2.2L2 18l2.2.8L5 21l.8-2.2L8 18l-2.2-.8L5 15ZM19 14l-.8 2.2L16 17l2.2.8L19 20l.8-2.2L22 17l-2.2-.8L19 14Z",
  archive: "M21 8v13H3V8M1 3h22v5H1zM10 12h4",
  refresh: "M20 7h-5V2M4 17h5v5M20 7a8 8 0 0 0-14.9-2M4 17a8 8 0 0 0 14.9 2",
  chat: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z",
  report: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-1.55-1H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63h.01A1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9v.01A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z",
  search: "m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  chevron: "m9 18 6-6-6-6",
  arrow: "M5 12h14M13 6l6 6-6 6",
  trend: "m3 17 6-6 4 4 8-8M15 7h6v6",
  warning: "M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01",
  check: "m5 12 4 4L19 6",
  plus: "M12 5v14M5 12h14",
  upload: "M12 16V4M7 9l5-5 5 5M4 20h16",
  filter: "M4 5h16M7 12h10M10 19h4",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  close: "M18 6 6 18M6 6l12 12",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z",
  file: "M14 2H6a2 2 0 0 0-2 2v16h16V8zM14 2v6h6",
  send: "m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2",
  menu: "M4 6h16M4 12h16M4 18h16",
  trash: "M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 5v6m4-6v6",
};

function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return <svg aria-hidden="true" className={className} fill="none" height={size} viewBox="0 0 24 24" width={size}><path d={iconPaths[name]} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

function Button({ children, variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const variants = {
    primary: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
    secondary: "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-rose-50 text-rose-700 hover:bg-rose-100",
  };
  return <button className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`} {...props}>{children}</button>;
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${className}`} {...props} />;
}

function Select({ className = "", children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${className}`} {...props}>{children}</select>;
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  const styles = { success: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", warning: "bg-amber-50 text-amber-700 ring-amber-600/15", danger: "bg-rose-50 text-rose-700 ring-rose-600/15", info: "bg-blue-50 text-blue-700 ring-blue-600/15", neutral: "bg-slate-100 text-slate-600 ring-slate-500/10" };
  return <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset ${styles[tone]}`}>{children}</span>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden min-w-0 ${className}`}>{children}</section>;
}

function PageHeader({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{title}</h1><p className="mt-1 text-xs sm:text-sm text-slate-500">{description}</p></div>{actions && <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">{actions}</div>}</div>;
}

const nav = [
  ["Overview", "grid"],
  ["Products", "tag"],
  ["Invoice Scanner", "scan"],
  ["Invoices", "file"],
  ["Suppliers", "users"],
  ["AI Assistant", "chat"],
  ["Reports", "report"],
  ["Settings", "settings"],
] as [string, IconName][];

const currency = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

function Sidebar({ active, onNavigate, open, onClose, onLogout, user }: { active: string; onNavigate: (n: string) => void; open: boolean; onClose: () => void; onLogout: () => void; user?: User | null }) {
  return <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-950 text-slate-300 transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}>
    <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
      <button className="flex items-center gap-2.5" onClick={() => onNavigate("Overview")}>
        <span className="grid size-8 place-items-center rounded-lg bg-emerald-500 text-sm font-extrabold text-slate-950">S</span>
        <span className="text-lg font-bold tracking-tight text-white">StockMind</span>
      </button>
      <button className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white" onClick={onClose} title="Hide menu"><Icon name="close" /></button>
    </div>
    <div className="mx-3 mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-md bg-amber-100 text-xs font-bold text-amber-800">
          {user?.shopName ? user.shopName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "SH"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{user?.shopName || "No Shop Configured"}</p>
          <p className="text-xs text-slate-400">{user?.shopId ? "Active workspace" : "Setup required"}</p>
        </div>
      </div>
    </div>
    <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
      {nav.map(([label, icon]) => <button key={label} onClick={() => { onNavigate(label); if (window.innerWidth < 1024) onClose(); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${active === label ? "bg-emerald-500/15 text-emerald-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><Icon name={icon} size={17} />{label}{label === "Invoice Scanner" && <span className="ml-auto rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">AI</span>}</button>)}
    </nav>
    <div className="border-t border-white/10 p-3"><button className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-white/5" onClick={onLogout}><span className="grid size-8 place-items-center rounded-full bg-slate-700 text-xs font-bold text-white">{user?.fullName ? user.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "US"}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{user?.fullName || "User"}</span><span className="block text-xs text-slate-500">Sign out</span></span><Icon name="arrow" /></button></div>
  </aside>;
}

function Header({ onMenu, onNavigate, sidebarOpen, onScanQr, printQueueCount = 0, onOpenPrintModal }: { onMenu: () => void; onNavigate: (n: string) => void; sidebarOpen?: boolean; onScanQr?: () => void; printQueueCount?: number; onOpenPrintModal?: () => void }) {
  return <header className="sticky top-0 z-30 flex h-16 w-full max-w-full items-center border-b border-slate-200 bg-white/95 px-2.5 sm:px-6 backdrop-blur overflow-hidden">
    <Button className="mr-1 sm:mr-2 px-2 sm:px-2.5 shrink-0" variant="ghost" onClick={onMenu} title={sidebarOpen ? "Hide menu" : "Show menu"}><Icon name="menu" /></Button>
    <div className="relative hidden w-full max-w-md md:block"><Icon className="absolute left-3 top-2.5 text-slate-400" name="search" size={17} /><Input className="bg-slate-50 pl-9" placeholder="Search products, suppliers, invoices…" /></div>
    <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
      {onOpenPrintModal && (
        <Button variant="secondary" className="px-2 sm:px-3 text-xs sm:text-sm shrink-0" onClick={onOpenPrintModal} title="Open A4 Barcode Print Sheet">
          <Icon name="file" size={16} />
          <span className="hidden sm:inline">Print Sheet</span>
          {printQueueCount > 0 && (
            <span className="rounded-full bg-emerald-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
              {printQueueCount}
            </span>
          )}
        </Button>
      )}
      <Button variant="secondary" className="px-2 sm:px-3.5 text-xs sm:text-sm shrink-0" onClick={onScanQr} title="Scan barcode to lookup product pricing">
        <Icon name="scan" size={16} />
        <span className="hidden sm:inline">Scan Barcode</span>
      </Button>
      <Button variant="secondary" className="px-2 sm:px-3.5 text-xs sm:text-sm shrink-0" onClick={() => onNavigate("Invoice Scanner")}><Icon name="upload" size={16} /><span className="hidden sm:inline">Scan invoice</span></Button>
      <button className="relative grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"><Icon name="bell" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-rose-500 ring-2 ring-white" /></button>
    </div>
  </header>;
}

function MetricCard({ title, value, meta, icon, tone = "emerald" }: { title: string; value: string; meta: string; icon: IconName; tone?: "emerald" | "amber" | "blue" | "violet" | "rose" }) {
  const tones = { emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", blue: "bg-blue-50 text-blue-700", violet: "bg-violet-50 text-violet-700", rose: "bg-rose-50 text-rose-700" };
  return <Card className="p-4"><div className="flex items-start justify-between"><p className="text-sm font-medium text-slate-500">{title}</p><span className={`grid size-8 place-items-center rounded-lg ${tones[tone]}`}><Icon name={icon} size={16} /></span></div><p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{meta}</p></Card>;
}

function ShopSetupView({ user, onShopCreated }: { user?: User | null; onShopCreated: (user: User) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Shop name is required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await createShop({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        gstin: gstin.trim(),
        address: address.trim(),
        currency,
      });
      onShopCreated(res.user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create shop profile");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <Icon name="box" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome, {user?.fullName || "Partner"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Set up your shop profile to initialize your workspace, inventory catalog, and invoice processing.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
            <Icon className="shrink-0" name="warning" size={15} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Shop or Business Name <span className="text-rose-500">*</span>
              <Input
                className="mt-1.5 h-11"
                placeholder="e.g. Verma Mini Mart"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-700">
              Business Phone
              <Input
                className="mt-1.5 h-11"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Business Email
              <Input
                className="mt-1.5 h-11"
                placeholder="shop@business.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-700">
              GSTIN <span className="font-normal text-slate-400">(optional)</span>
              <Input
                className="mt-1.5 h-11"
                placeholder="23AABCU9603R1ZM"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Currency
              <Select
                className="mt-1.5 h-11 w-full"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </Select>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Shop Address / Location
              <Input
                className="mt-1.5 h-11"
                placeholder="e.g. 42, Scheme No. 54, Vijay Nagar, Indore"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
          </div>

          <div className="pt-2">
            <Button className="h-11 w-full text-sm font-semibold" disabled={loading} type="submit">
              {loading ? "Configuring your shop…" : "Complete Shop Setup"}
              {!loading && <Icon name="arrow" size={16} />}
            </Button>
          </div>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
            <Icon name="scan" size={18} />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-800">Smart OCR Invoicing</h3>
          <p className="mt-1 text-xs text-slate-500">Scan and parse paper or PDF purchase bills directly into your database.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
            <Icon name="box" size={18} />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-800">Live Inventory</h3>
          <p className="mt-1 text-xs text-slate-500">Monitor stock levels, automatic dead-stock flags, and reorder levels.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid size-9 place-items-center rounded-lg bg-violet-50 text-violet-600">
            <Icon name="trend" size={18} />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-800">Margin Analytics</h3>
          <p className="mt-1 text-xs text-slate-500">Compare historical supplier costs against selling prices to protect profits.</p>
        </div>
      </div>
    </div>
  );
}

function Overview({ onNavigate, user, onShopCreated, onShowQr }: { onNavigate: (n: string) => void; user?: User | null; onShopCreated: (user: User) => void; onShowQr?: (p: any) => void }) {
  const [productsList, setProductsList] = useState<ProductDetail[]>([]);
  const [invoicesList, setInvoicesList] = useState<PurchaseInvoiceDto[]>([]);
  const [suppliersList, setSuppliersList] = useState<SupplierSummary[]>([]);
  const [period, setPeriod] = useState("30");

  const loadOverviewData = useCallback(() => {
    Promise.all([
      fetchShopProducts().catch(() => []),
      fetchPurchaseInvoices().catch(() => []),
      fetchSuppliers().catch(() => []),
    ]).then(([prods, invs, supps]) => {
      setProductsList(prods);
      setInvoicesList(invs);
      setSuppliersList(supps);
    });
  }, []);

  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData, user?.shopId]);

  const filteredInvoices = useMemo(() => {
    if (period === "all") return invoicesList;
    const days = parseInt(period, 10) || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return invoicesList.filter(inv => {
      const d = inv.invoiceDate || inv.createdAt;
      if (!d) return true;
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) || parsed >= cutoff;
    });
  }, [invoicesList, period]);

  const inventoryValue = useMemo(() => {
    return productsList.reduce((acc, p) => {
      const cost = Number(p.buyingPrice ?? p.lastPurchaseCost ?? 0) || Number(p.sellingPrice ?? 0);
      return acc + (Number(p.stock ?? 0) * cost);
    }, 0);
  }, [productsList]);

  const totalStockUnits = useMemo(() => {
    return productsList.reduce((acc, p) => acc + Number(p.stock ?? 0), 0);
  }, [productsList]);

  const lowStockProducts = useMemo(() => {
    return productsList.filter(p => Number(p.stock ?? 0) > 0 && Number(p.stock ?? 0) < 10);
  }, [productsList]);

  const outOfStockProducts = useMemo(() => {
    return productsList.filter(p => Number(p.stock ?? 0) === 0);
  }, [productsList]);

  const unpricedProducts = useMemo(() => {
    return productsList.filter(p => !p.sellingPrice || Number(p.sellingPrice) <= 0);
  }, [productsList]);

  const estimatedMargin = useMemo(() => {
    const priced = productsList.filter(p => Number(p.sellingPrice ?? 0) > 0);
    if (!priced.length) return 0;
    const totalMargin = priced.reduce((acc, p) => {
      const price = Number(p.sellingPrice ?? 0);
      const cost = Number(p.buyingPrice ?? p.lastPurchaseCost ?? 0);
      const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
      return acc + margin;
    }, 0);
    return Math.round((totalMargin / priced.length) * 10) / 10;
  }, [productsList]);

  const totalPurchaseSpend = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => acc + Number(inv.totalAmount ?? 0), 0);
  }, [filteredInvoices]);

  const topProducts = useMemo(() => {
    return productsList.slice().sort((a, b) => {
      const valA = Number(a.stock ?? 0) * (Number(a.buyingPrice ?? a.lastPurchaseCost ?? 0) || Number(a.sellingPrice ?? 0));
      const valB = Number(b.stock ?? 0) * (Number(b.buyingPrice ?? b.lastPurchaseCost ?? 0) || Number(b.sellingPrice ?? 0));
      return valB - valA;
    }).slice(0, 5);
  }, [productsList]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    productsList.forEach(p => {
      const cat = p.category?.trim() || "General";
      const val = Number(p.stock ?? 0) * (Number(p.buyingPrice ?? p.lastPurchaseCost ?? 0) || Number(p.sellingPrice ?? 0));
      const cur = map.get(cat) || { count: 0, value: 0 };
      map.set(cat, { count: cur.count + 1, value: cur.value + val });
    });
    const totalVal = Array.from(map.values()).reduce((acc, c) => acc + c.value, 0) || 1;
    const colors = ["#059669", "#0d9488", "#0284c7", "#d97706", "#7c3aed", "#e11d48", "#64748b"];
    const entries = Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        value: data.value,
        pct: Math.round((data.value / totalVal) * 100) || Math.round((data.count / (productsList.length || 1)) * 100),
      }))
      .sort((a, b) => b.value - a.value);

    let currentAngle = 0;
    const gradientStops = entries.map((entry, idx) => {
      const color = colors[idx % colors.length];
      const start = currentAngle;
      const end = currentAngle + entry.pct;
      currentAngle = end;
      return `${color} ${start}% ${end}%`;
    });

    const conic = gradientStops.length > 0 ? `conic-gradient(${gradientStops.join(", ")})` : undefined;
    return { entries, conic, totalVal };
  }, [productsList]);

  const monthlyTrend = useMemo(() => {
    const months: { label: string; key: string; spend: number; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-US", { month: "short" });
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ label, key, spend: 0, count: 0 });
    }

    invoicesList.forEach(inv => {
      const rawDate = inv.invoiceDate || inv.createdAt;
      if (!rawDate) return;
      const dateObj = new Date(rawDate);
      if (isNaN(dateObj.getTime())) return;
      const k = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      const found = months.find(m => m.key === k);
      if (found) {
        found.spend += Number(inv.totalAmount ?? 0);
        found.count += 1;
      }
    });

    const maxSpend = Math.max(...months.map(m => m.spend), 1);
    return months.map(m => ({
      ...m,
      pct: m.spend > 0 ? Math.max(12, Math.round((m.spend / maxSpend) * 100)) : 6,
    }));
  }, [invoicesList]);

  const attentionItems = useMemo(() => {
    const list: { icon: IconName; title: string; sub: string; target: string; tone: "amber" | "rose" | "blue" | "emerald" }[] = [];
    if (outOfStockProducts.length > 0) {
      list.push({
        icon: "warning",
        title: `${outOfStockProducts.length} items out of stock`,
        sub: "Zero inventory on shelf. Restock immediately to prevent lost sales.",
        target: "Products",
        tone: "rose",
      });
    }
    if (lowStockProducts.length > 0) {
      list.push({
        icon: "warning",
        title: `${lowStockProducts.length} items low on stock`,
        sub: "Current stock quantity is under 10 units. Create replenishment orders.",
        target: "Products",
        tone: "amber",
      });
    }
    if (unpricedProducts.length > 0) {
      list.push({
        icon: "tag",
        title: `${unpricedProducts.length} products missing selling prices`,
        sub: "Set retail prices to generate barcodes and enable register checkout.",
        target: "Products",
        tone: "amber",
      });
    }
    if (!invoicesList.length) {
      list.push({
        icon: "scan",
        title: "Scan your first purchase invoice",
        sub: "AI invoice scanner extracts items, prices, and taxes automatically.",
        target: "Invoice Scanner",
        tone: "blue",
      });
    } else {
      list.push({
        icon: "cart",
        title: `${invoicesList.length} purchase invoices recorded`,
        sub: `Total invoice spend of ${currency(totalPurchaseSpend)} tracked.`,
        target: "Purchases",
        tone: "blue",
      });
    }
    if (suppliersList.length > 0) {
      list.push({
        icon: "users",
        title: `${suppliersList.length} active suppliers registered`,
        sub: "View purchase orders, payment statuses, and vendor contacts.",
        target: "Suppliers",
        tone: "emerald",
      });
    }
    return list;
  }, [outOfStockProducts, lowStockProducts, unpricedProducts, invoicesList, suppliersList, totalPurchaseSpend]);

  if (!user?.shopId) {
    return <ShopSetupView user={user} onShopCreated={onShopCreated} />;
  }

  return <>
    <PageHeader
      title={`Good morning, ${user?.fullName || "Partner"}`}
      description={`Here's live operational intelligence for ${user?.shopName || "your shop"}.`}
      actions={
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
          <Button onClick={() => onNavigate("Products")}>
            <Icon name="plus" size={16} />
            <span>Add product</span>
          </Button>
        </div>
      }
    />

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 min-w-0">
      <MetricCard
        title="Inventory valuation"
        value={currency(inventoryValue)}
        meta={`${totalStockUnits} stock units across catalogue`}
        icon="box"
      />
      <MetricCard
        title="Active products"
        value={String(productsList.length)}
        meta={`${categoryBreakdown.entries.length} active product categories`}
        icon="tag"
        tone="blue"
      />
      <MetricCard
        title="Low & out of stock"
        value={String(lowStockProducts.length + outOfStockProducts.length)}
        meta={`${outOfStockProducts.length} out of stock, ${lowStockProducts.length} low`}
        icon="warning"
        tone={outOfStockProducts.length > 0 ? "rose" : "amber"}
      />
      <MetricCard
        title="Estimated margin"
        value={`${estimatedMargin}%`}
        meta={totalPurchaseSpend > 0 ? `Spend: ${currency(totalPurchaseSpend)}` : "Across priced catalog items"}
        icon="trend"
        tone="violet"
      />
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr] min-w-0">
      <Card className="min-w-0">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <div>
            <h2 className="font-bold text-slate-900">Purchase spend trend</h2>
            <p className="mt-0.5 text-xs text-slate-500">Monthly invoice procurement volume</p>
          </div>
          <div className="text-right">
            <p className="text-base sm:text-lg font-bold text-slate-900">{currency(totalPurchaseSpend)}</p>
            <p className="text-xs font-medium text-emerald-600">{invoicesList.length} invoices recorded</p>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex h-48 sm:h-52 items-end gap-2 border-b border-slate-100 pb-1">
            {monthlyTrend.map((m) => (
              <div className="group relative flex h-full flex-1 flex-col items-center justify-end" key={m.key}>
                <div className="absolute -top-10 hidden flex-col items-center group-hover:flex z-10 pointer-events-none">
                  <span className="whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] font-semibold text-white shadow-md">
                    {currency(m.spend)} ({m.count} inv)
                  </span>
                  <span className="border-4 border-transparent border-t-slate-800" />
                </div>
                <div
                  className={`w-full rounded-t transition-all ${
                    m.spend > 0 ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-100"
                  }`}
                  style={{ height: `${m.pct}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex justify-between text-[11px] font-medium text-slate-500">
            {monthlyTrend.map((m) => (
              <span key={m.key} className="text-center flex-1">{m.label}</span>
            ))}
          </div>
        </div>
      </Card>

      <Card className="min-w-0">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <div>
            <h2 className="font-bold text-slate-900">Needs attention</h2>
            <p className="mt-0.5 text-xs text-slate-500">Prioritized by business impact</p>
          </div>
          <Badge tone={attentionItems.some(i => i.tone === "rose") ? "danger" : "warning"}>
            {attentionItems.length} alerts
          </Badge>
        </div>
        <div className="divide-y divide-slate-100">
          {attentionItems.map((item, idx) => (
            <button
              className="flex w-full items-start gap-3 p-3.5 sm:p-4 text-left hover:bg-slate-50 transition"
              key={idx}
              onClick={() => onNavigate(item.target)}
            >
              <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${item.tone === "amber" ? "bg-amber-50 text-amber-700" : item.tone === "rose" ? "bg-rose-50 text-rose-700" : item.tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                <Icon name={item.icon} size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-800 truncate">{item.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{item.sub}</span>
              </span>
              <Icon className="mt-1 text-slate-400 shrink-0" name="arrow" size={15} />
            </button>
          ))}
        </div>
      </Card>
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-3 min-w-0">
      <Card className="lg:col-span-2 min-w-0">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <div>
            <h2 className="font-bold text-slate-900">Top products by value</h2>
            <p className="text-xs text-slate-500">Highest value inventory units in shop</p>
          </div>
          <Button variant="ghost" onClick={() => onNavigate("Products")}>
            <span>View all</span>
            <Icon name="arrow" size={15} />
          </Button>
        </div>
        <ProductTable compact productsList={topProducts} onProduct={() => onNavigate("Products")} onShowQr={onShowQr} />
      </Card>

      <Card className="p-4 sm:p-5 min-w-0">
        <h2 className="font-bold text-slate-900">Category breakdown</h2>
        <p className="text-xs text-slate-500">Inventory share by product category</p>
        <div className="mt-5 flex flex-col sm:flex-row items-center gap-5">
          <div
            className="grid size-28 shrink-0 place-items-center rounded-full shadow-inner"
            style={{ background: categoryBreakdown.conic || "#059669" }}
          >
            <div className="grid size-16 place-items-center rounded-full bg-white text-center shadow-sm">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Categories</span>
              <strong className="-mt-1 text-xs text-slate-900">{categoryBreakdown.entries.length}</strong>
            </div>
          </div>
          <div className="space-y-2 text-xs w-full min-w-0">
            {categoryBreakdown.entries.length === 0 ? (
              <p className="text-xs text-slate-400">No products added yet.</p>
            ) : (
              categoryBreakdown.entries.slice(0, 4).map((x, idx) => {
                const colors = ["bg-emerald-600", "bg-teal-700", "bg-blue-600", "bg-amber-500"];
                return (
                  <div className="flex items-center justify-between gap-2" key={x.name}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`size-2 rounded-full shrink-0 ${colors[idx % colors.length]}`} />
                      <span className="truncate text-slate-600">{x.name}</span>
                    </div>
                    <strong className="text-slate-800 shrink-0">{x.pct}%</strong>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>
    </div>
  </>;
}

function ProductTable({
  compact = false,
  productsList,
  onProduct,
  onShowQr,
  onAddToPrintQueue,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDeleteSingle,
}: {
  compact?: boolean;
  productsList?: ProductDetail[];
  onProduct: (p: ProductDetail) => void;
  onShowQr?: (p: any) => void;
  onAddToPrintQueue?: (p: any) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onDeleteSingle?: (p: ProductDetail) => void;
}) {
  const [liveProducts, setLiveProducts] = useState<ProductDetail[]>([]);

  useEffect(() => {
    if (!productsList) {
      fetchShopProducts().then(setLiveProducts).catch(() => {});
    }
  }, [productsList]);

  const items = productsList || liveProducts;
  const rows = compact ? items.slice(0, 4) : items;

  if (rows.length === 0) {
    return <div className="p-8 text-center text-sm text-slate-500">No products registered yet. Click &quot;Add product&quot; or scan an invoice to populate.</div>;
  }

  const allSelected = rows.length > 0 && selectedIds ? rows.every(p => selectedIds.has(p.id)) : false;

  return (
    <>
      <div className="divide-y divide-slate-100 sm:hidden">
        {rows.map(p => {
          const cost = Number(p.buyingPrice ?? p.lastPurchaseCost ?? 0);
          const price = Number(p.sellingPrice ?? 0);
          const margin = price > 0 ? Math.round(((price - cost) / price) * 100 * 10) / 10 : 0;
          const stock = Number(p.stock ?? 0);
          const status = stock === 0 ? "Out of stock" : stock < 10 ? "Low stock" : "In stock";
          const isSelected = selectedIds?.has(p.id) || false;
          return (
            <div
              className={`p-3.5 transition active:bg-slate-100 cursor-pointer ${isSelected ? "bg-emerald-50/60" : "hover:bg-slate-50"}`}
              key={p.id || p.sku}
              onClick={() => onProduct(p)}
            >
              <div className="flex items-start gap-2.5">
                {!compact && (
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                    checked={isSelected}
                    onChange={() => onToggleSelect && onToggleSelect(p.id)}
                    onClick={e => e.stopPropagation()}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-800 text-sm truncate">{p.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{p.sku} {p.category ? `· ${p.category}` : ""}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge tone={status === "In stock" ? "success" : status === "Low stock" ? "warning" : "danger"}>
                    {status}
                  </Badge>
                  <span className="text-[11px] font-semibold text-slate-500">{stock} {p.unit || ""}</span>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2.5 text-[11px]">
                  <div>
                    <span className="text-slate-400">Price: </span>
                    <span className="font-bold text-emerald-800">{currency(price)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Cost: </span>
                    <span className="text-slate-600">{currency(cost)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Margin: </span>
                    <span className="font-semibold text-emerald-700">{margin}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onShowQr) onShowQr(p);
                    }}
                  >
                    <Icon name="scan" size={12} />
                    <span>Barcode</span>
                  </button>
                  {onAddToPrintQueue && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToPrintQueue(p);
                      }}
                      title="Add to A4 print queue"
                    >
                      <Icon name="plus" size={11} />
                      <span>Print</span>
                    </button>
                  )}
                  {!compact && onDeleteSingle && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSingle(p);
                      }}
                      title="Remove product from inventory"
                    >
                      <Icon name="trash" size={11} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-500">
              {!compact && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                  />
                </th>
              )}
              <th className="px-5 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Cost</th>
              <th className="px-4 py-3 font-semibold">Selling price</th>
              <th className="px-4 py-3 font-semibold">Margin</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(p => {
              const cost = Number(p.buyingPrice ?? p.lastPurchaseCost ?? 0);
              const price = Number(p.sellingPrice ?? 0);
              const margin = price > 0 ? Math.round(((price - cost) / price) * 100 * 10) / 10 : 0;
              const stock = Number(p.stock ?? 0);
              const status = stock === 0 ? "Out of stock" : stock < 10 ? "Low stock" : "In stock";
              const isSelected = selectedIds?.has(p.id) || false;
              return (
                <tr className={`cursor-pointer text-sm transition ${isSelected ? "bg-emerald-50/50" : "hover:bg-slate-50"}`} key={p.id || p.sku} onClick={() => onProduct(p)}>
                  {!compact && (
                    <td className="w-10 px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        checked={isSelected}
                        onChange={() => onToggleSelect && onToggleSelect(p.id)}
                      />
                    </td>
                  )}
                  <td className="px-5 py-3">
                    <div className="font-semibold text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-400">{p.sku} {p.category ? `· ${p.category}` : ""}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">{stock} {p.unit || ""}</td>
                  <td className="px-4 py-3">{currency(cost)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-800">{currency(price)}</td>
                  <td className="px-4 py-3 font-medium text-emerald-700">{margin}%</td>
                  <td className="px-4 py-3">
                    <Badge tone={status === "In stock" ? "success" : status === "Low stock" ? "warning" : "danger"}>{status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1.5 justify-center">
                      <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm" onClick={() => onShowQr && onShowQr(p)}>
                        <Icon name="scan" size={13} />
                        <span>Barcode</span>
                      </button>
                      {onAddToPrintQueue && (
                        <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 shadow-sm" onClick={() => onAddToPrintQueue(p)} title="Add to A4 print queue">
                          <Icon name="plus" size={12} />
                          <span>Print</span>
                        </button>
                      )}
                      {!compact && onDeleteSingle && (
                        <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 shadow-sm" onClick={() => onDeleteSingle(p)} title="Remove product from inventory">
                          <Icon name="trash" size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProductDialog({ product, isNew = false, onClose, onShowQr, onSaved }: { product: Partial<ProductDetail>; isNew?: boolean; onClose: () => void; onShowQr?: (p: any) => void; onSaved?: () => void }) {
  const [form, setForm] = useState({
    name: product.name || "",
    sku: product.sku || "",
    category: product.category || "Grocery",
    brand: product.brand || "",
    unit: product.unit || "PIECE",
    buyingPrice: product.buyingPrice ?? product.lastPurchaseCost ?? 0,
    sellingPrice: product.sellingPrice ?? 0,
    mrp: product.mrp ?? 0,
    discountPrice: product.discountPrice ?? 0,
    stock: product.stock ?? 0,
    hsnSac: product.hsnSac || "",
    pitchHook: product.pitchHook || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [webIntelligence, setWebIntelligence] = useState<ProductWebIntelligence | null>(null);
  const [err, setErr] = useState("");

  const handleEnrich = async () => {
    if (!form.name.trim()) {
      setErr("Enter a product name to search the web for details");
      return;
    }
    setEnriching(true);
    setErr("");
    try {
      const data = await enrichProductWeb(form.name.trim());
      setWebIntelligence(data);
      setForm(prev => ({
        ...prev,
        name: data.suggestedName || prev.name,
        brand: data.brand || prev.brand,
        category: data.category || prev.category,
        mrp: data.estimatedMrp ? Number(data.estimatedMrp) : prev.mrp,
        hsnSac: data.hsnCode || prev.hsnSac,
        pitchHook: data.salesPitch || prev.pitchHook,
      }));
    } catch (e: any) {
      setErr(e.message || "Failed to retrieve web intelligence");
    } finally {
      setEnriching(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setErr("Product name is required");
      return;
    }
    setSubmitting(true);
    setErr("");
    try {
      await createProduct(form);
      if (onSaved) onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message || "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!product.id) return;
    if (!window.confirm(`Are you sure you want to remove "${form.name}" from inventory? Related stock levels, pricing, and history will be cleared while purchase invoice records remain safe.`)) {
      return;
    }
    setDeleting(true);
    setErr("");
    try {
      await deleteProduct(product.id);
      if (onSaved) onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message || "Failed to remove product");
      setDeleting(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 p-0 sm:p-4 backdrop-blur-sm" onMouseDown={onClose}><Card className="w-full max-w-2xl rounded-t-2xl sm:rounded-xl max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"><div className="flex flex-col h-full min-h-0" onMouseDown={e => e.stopPropagation()}><div className="flex items-start justify-between border-b border-slate-100 p-4 sm:p-5"><div><h2 className="text-lg sm:text-xl font-bold text-slate-900">{isNew ? "Add New Product" : form.name}</h2><p className="text-xs sm:text-sm text-slate-500">{form.sku ? `SKU: ${form.sku}` : "Provide details or fetch live intelligence from the web"}</p></div><Button variant="ghost" onClick={onClose}><Icon name="close" /></Button></div>
    {err && <div className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
    
    <div className="flex-1 overflow-y-auto p-4 sm:p-5">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-white shrink-0"><Icon name="spark" size={16} /></span>
          <div>
            <div className="text-xs font-bold text-emerald-950">SearXNG Product Intelligence</div>
            <div className="text-[11px] text-emerald-700">Search the web for MRP, HSN, brand, and counter sales hooks</div>
          </div>
        </div>
        <Button disabled={enriching || !form.name.trim()} onClick={handleEnrich} type="button" variant="secondary" className="w-full sm:w-auto border-emerald-300 text-emerald-800 hover:bg-emerald-100 shrink-0">
          <Icon name="search" size={14} />
          {enriching ? "Searching..." : "Auto-fill from Web"}
        </Button>
      </div>

      {webIntelligence && webIntelligence.sources.length > 0 && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Web Sources Found</div>
          <div className="space-y-1">
            {webIntelligence.sources.slice(0, 3).map((s, idx) => (
              <a className="block truncate text-xs text-blue-600 hover:underline" href={s.url} key={idx} rel="noopener noreferrer" target="_blank">
                • {s.title || s.url}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Product name *<Input className="mt-1.5" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Fortune Sunflower Oil 1L" /></label>
        <label className="text-xs font-semibold text-slate-600">SKU / Code<Input className="mt-1.5" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="Leave blank to auto-generate" /></label>
        <label className="text-xs font-semibold text-slate-600">Category<Select className="mt-1.5 w-full" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option>Grocery</option><option>Home care</option><option>Personal care</option><option>Snacks</option><option>Beverages</option><option>General</option></Select></label>
        <label className="text-xs font-semibold text-slate-600">Brand<Input className="mt-1.5" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Fortune" /></label>
        <label className="text-xs font-semibold text-slate-600">Unit<Select className="mt-1.5 w-full" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}><option value="PIECE">PIECE</option><option value="KG">KG</option><option value="LITRE">LITRE</option><option value="PACKET">PACKET</option><option value="BOX">BOX</option></Select></label>
        <label className="text-xs font-semibold text-slate-600">Cost price (₹)<Input className="mt-1.5" type="number" step="0.01" value={form.buyingPrice} onChange={e => setForm({ ...form, buyingPrice: Number(e.target.value) })} /></label>
        <label className="text-xs font-semibold text-slate-600">Selling price (₹) *<Input className="mt-1.5" type="number" step="0.01" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: Number(e.target.value) })} /></label>
        <label className="text-xs font-semibold text-slate-600">MRP (₹)<Input className="mt-1.5" type="number" step="0.01" value={form.mrp} onChange={e => setForm({ ...form, mrp: Number(e.target.value) })} /></label>
        <label className="text-xs font-semibold text-slate-600">Discounted / Offer price (₹)<Input className="mt-1.5" type="number" step="0.01" value={form.discountPrice} onChange={e => setForm({ ...form, discountPrice: Number(e.target.value) })} /></label>
        <label className="text-xs font-semibold text-slate-600">Current Stock Quantity<Input className="mt-1.5" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} /></label>
        <label className="text-xs font-semibold text-slate-600">HSN / SAC<Input className="mt-1.5" value={form.hsnSac} onChange={e => setForm({ ...form, hsnSac: e.target.value })} placeholder="e.g. 1512" /></label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Sales Pitch Hook<Input className="mt-1.5" value={form.pitchHook} onChange={e => setForm({ ...form, pitchHook: e.target.value })} placeholder="Customer counter recommendation hook" /></label>
      </div>
    </div>
    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-slate-100 p-3.5 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        {!isNew && (product.sku || product.qrToken) && (
          <Button variant="secondary" className="w-full sm:w-auto" onClick={() => onShowQr && onShowQr(product)}>
            <Icon name="scan" size={15} />View / Print Barcode
          </Button>
        )}
        {!isNew && product.id && (
          <Button variant="danger" className="w-full sm:w-auto text-xs sm:text-sm" disabled={deleting || submitting} onClick={handleDelete}>
            <Icon name="trash" size={14} />
            {deleting ? "Removing..." : "Remove from inventory"}
          </Button>
        )}
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <Button variant="secondary" className="flex-1 sm:flex-initial" onClick={onClose}>Cancel</Button>
        <Button disabled={submitting || deleting} className="flex-1 sm:flex-initial" onClick={handleSave}>
          <Icon name="check" size={16} />{submitting ? "Saving..." : "Save product"}
        </Button>
      </div>
    </div></div></Card></div>;
}

function ProductsScreen({ onShowQr, onScanQr, printQueueCount = 0, onOpenPrintModal, onAddToPrintQueue }: { onShowQr?: (p: any) => void; onScanQr?: () => void; printQueueCount?: number; onOpenPrintModal?: () => void; onAddToPrintQueue?: (p: any) => void }) {
  const [productsList, setProductsList] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All status");
  const [selected, setSelected] = useState<ProductDetail | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; ids: string[]; count: number; title: string }>({
    open: false,
    ids: [],
    count: 0,
    title: "",
  });
  const [batchDeleting, setBatchDeleting] = useState(false);

  const loadProducts = () => {
    setLoading(true);
    fetchShopProducts().then(res => {
      setProductsList(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = useMemo(() => {
    return productsList.filter(p => {
      const matchQuery = p.name.toLowerCase().includes(query.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(query.toLowerCase()));
      const stock = Number(p.stock ?? 0);
      const prodStatus = stock === 0 ? "Out of stock" : stock < 10 ? "Low stock" : "In stock";
      const matchStatus = status === "All status" || prodStatus === status;
      return matchQuery && matchStatus;
    });
  }, [productsList, query, status]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const selectable = filtered.map(p => p.id).filter(Boolean);
    if (selectable.length > 0 && selectedIds.size === selectable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectable));
    }
  };

  const handleDeleteSingle = (p: ProductDetail) => {
    setDeleteConfirm({
      open: true,
      ids: [p.id],
      count: 1,
      title: `Remove "${p.name}" from inventory?`,
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm.ids.length === 0) return;
    setBatchDeleting(true);
    try {
      if (deleteConfirm.ids.length === 1) {
        await deleteProduct(deleteConfirm.ids[0]);
      } else {
        await deleteProductsBatch(deleteConfirm.ids);
      }
      setSelectedIds(prev => {
        const next = new Set(prev);
        deleteConfirm.ids.forEach(id => next.delete(id));
        return next;
      });
      setDeleteConfirm({ open: false, ids: [], count: 0, title: "" });
      loadProducts();
    } catch (e: any) {
      alert(e.message || "Failed to remove products");
    } finally {
      setBatchDeleting(false);
    }
  };

  const totalStockUnits = useMemo(() => productsList.reduce((acc, p) => acc + Number(p.stock ?? 0), 0), [productsList]);
  const totalValuation = useMemo(() => productsList.reduce((acc, p) => acc + (Number(p.stock ?? 0) * Number(p.buyingPrice ?? p.lastPurchaseCost ?? 0)), 0), [productsList]);

  return <>
    <PageHeader
      title="Products"
      description="Manage your product catalogue, stock levels, pricing, and barcodes in one place."
      actions={
        <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Button className="w-full sm:w-auto px-3.5 text-xs sm:text-sm order-first sm:order-last" onClick={() => { setSelected({ name: "", sku: "", category: "Grocery", stock: 0, sellingPrice: 0, buyingPrice: 0 } as ProductDetail); setIsNewProduct(true); }}>
            <Icon name="plus" size={16} />
            <span>Add product</span>
          </Button>
          <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:flex sm:items-center sm:gap-2">
            {onOpenPrintModal && (
              <Button variant="secondary" className="px-1.5 sm:px-3 text-xs w-full sm:w-auto relative justify-center" onClick={onOpenPrintModal} title="A4 Print Sheet">
                <Icon name="file" size={15} />
                <span className="truncate">Print</span>
                {printQueueCount > 0 && (
                  <span className="rounded-full bg-emerald-600 px-1 py-0.2 text-[9px] font-bold text-white shrink-0">
                    {printQueueCount}
                  </span>
                )}
              </Button>
            )}
            <Button variant="secondary" className="px-1.5 sm:px-3 text-xs w-full sm:w-auto justify-center" onClick={onScanQr} title="Scan Barcode">
              <Icon name="scan" size={15} />
              <span className="truncate">Scan</span>
            </Button>
            <Button variant="secondary" className="px-1.5 sm:px-3 text-xs w-full sm:w-auto justify-center" onClick={() => setImporting(true)} title="Import CSV or Excel">
              <Icon name="upload" size={15} />
              <span className="truncate">Import</span>
            </Button>
          </div>
        </div>
      }
    />

    {selectedIds.size > 0 && (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-3 sm:px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-7 place-items-center rounded-lg bg-rose-600 text-xs font-bold text-white shadow-sm">
            {selectedIds.size}
          </span>
          <div>
            <div className="text-xs sm:text-sm font-bold text-rose-950">
              {selectedIds.size} product{selectedIds.size > 1 ? "s" : ""} selected
            </div>
            <div className="text-[11px] text-rose-700">
              Selected items can be removed from active inventory simultaneously
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-8 px-2.5 text-xs bg-white text-slate-700 hover:bg-slate-50"
            onClick={toggleSelectAll}
          >
            {selectedIds.size === filtered.length ? "Deselect all" : `Select all (${filtered.length})`}
          </Button>
          <Button
            type="button"
            variant="danger"
            className="h-8 px-3 text-xs shadow-sm bg-rose-600 text-white hover:bg-rose-700"
            onClick={() =>
              setDeleteConfirm({
                open: true,
                ids: Array.from(selectedIds),
                count: selectedIds.size,
                title: `Remove ${selectedIds.size} product${selectedIds.size > 1 ? "s" : ""} from inventory?`,
              })
            }
          >
            <Icon name="trash" size={14} />
            <span>Remove {selectedIds.size} from inventory</span>
          </Button>
        </div>
      </div>
    )}

    <div className="grid gap-3 sm:grid-cols-3 mb-4">
      <MetricCard title="Total Products" value={String(productsList.length)} meta="In active catalogue" icon="tag" tone="blue" />
      <MetricCard title="Total Stock Units" value={String(totalStockUnits)} meta="Quantity on hand across all items" icon="box" tone="emerald" />
      <MetricCard title="Inventory Valuation" value={currency(totalValuation)} meta="Calculated from buying cost" icon="report" />
    </div>
    <Card>
      <div className="flex flex-col gap-2.5 border-b border-slate-100 p-3 sm:p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon className="absolute left-3 top-2.5 text-slate-400" name="search" size={17} />
          <Input className="pl-9" placeholder="Search by product name, SKU or brand" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Select className="flex-1 sm:w-auto text-xs sm:text-sm" value={status} onChange={e => setStatus(e.target.value)}>
            <option>All status</option>
            <option>In stock</option>
            <option>Low stock</option>
            <option>Out of stock</option>
          </Select>
          <Button variant="secondary" className="shrink-0 px-3 text-xs sm:text-sm" onClick={loadProducts}>
            <Icon name="refresh" size={16} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="p-16 text-center text-sm text-slate-500">Loading products from database...</div>
      ) : filtered.length ? (
        <ProductTable
          productsList={filtered}
          onProduct={(p) => { setSelected(p); setIsNewProduct(false); }}
          onShowQr={onShowQr}
          onAddToPrintQueue={onAddToPrintQueue}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onDeleteSingle={handleDeleteSingle}
        />
      ) : (
        <div className="grid place-items-center py-20 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400"><Icon name="search" /></span>
          <h3 className="mt-3 font-bold text-slate-800">No products found</h3>
          <p className="mt-1 text-sm text-slate-500">Try changing your search or add a new product.</p>
        </div>
      )}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
        <span>Showing {filtered.length} of {productsList.length} products</span>
        {selectedIds.size > 0 && <span className="font-semibold text-rose-600">{selectedIds.size} selected</span>}
      </div>
    </Card>
    {selected && <ProductDialog product={selected} isNew={isNewProduct} onClose={() => setSelected(null)} onShowQr={onShowQr} onSaved={loadProducts} />}
    {importing && <CsvImport onClose={() => setImporting(false)} />}

    {deleteConfirm.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
        <Card className="w-full max-w-md p-5 shadow-2xl">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700">
              <Icon name="warning" size={20} />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {deleteConfirm.title}
              </h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                This will remove {deleteConfirm.count} product{deleteConfirm.count > 1 ? "s" : ""} from your inventory catalogue, including live stock balances, price points, and movement history. Purchase invoice transaction history will be safely preserved.
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              variant="secondary"
              className="text-xs"
              onClick={() => setDeleteConfirm({ open: false, ids: [], count: 0, title: "" })}
              disabled={batchDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="text-xs bg-rose-600 text-white hover:bg-rose-700"
              onClick={handleConfirmDelete}
              disabled={batchDeleting}
            >
              {batchDeleting ? "Removing..." : `Remove ${deleteConfirm.count} Product${deleteConfirm.count > 1 ? "s" : ""}`}
            </Button>
          </div>
        </Card>
      </div>
    )}
  </>;
}

function CsvImport({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 p-0 sm:p-4 backdrop-blur-sm"><Card className="w-full max-w-3xl rounded-t-2xl sm:rounded-xl shadow-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5"><div><h2 className="text-base sm:text-lg font-bold text-slate-900">Import products</h2><p className="text-xs sm:text-sm text-slate-500">Upload and map a CSV or Excel file</p></div><Button variant="ghost" onClick={onClose}><Icon name="close" /></Button></div><div className="flex-1 overflow-y-auto">{step === 1 ? <div className="p-4 sm:p-6"><button className="grid w-full place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 sm:py-14 hover:border-emerald-400 hover:bg-emerald-50/30" onClick={() => setStep(2)}><span className="grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="upload" /></span><strong className="mt-3 text-sm text-slate-800">Choose a file or drag it here</strong><span className="mt-1 text-xs text-slate-500">CSV, XLS or XLSX up to 10 MB</span></button></div> : <div className="p-4 sm:p-6"><div className="mb-4 flex items-center gap-3 rounded-lg bg-emerald-50 p-3 text-xs sm:text-sm text-emerald-800"><Icon name="check" /><strong>products_march.xlsx</strong><span className="text-emerald-600">· 126 rows found</span></div><h3 className="font-bold text-sm sm:text-base text-slate-800">Map file columns</h3><div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">{[["Product Name","Name"],["Item Code","SKU"],["Purchase Rate","Cost price"],["MRP","Selling price"],["Closing Stock","Opening quantity"],["GST %","Tax rate"]].map(x => <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3" key={x[0]}><span className="flex-1 text-xs font-medium text-slate-500">{x[0]}</span><Icon name="arrow" size={14} /><Select className="text-xs" defaultValue={x[1]}>{[x[1],"Ignore"].map(v=><option key={v}>{v}</option>)}</Select></div>)}</div></div>}</div><div className="flex justify-end gap-2 border-t border-slate-100 p-3.5 sm:p-4"><Button variant="secondary" className="flex-1 sm:flex-initial" onClick={onClose}>Cancel</Button>{step === 2 && <Button className="flex-1 sm:flex-initial" onClick={onClose}>Import 126 products</Button>}</div></Card></div>;
}

interface ReviewItem {
  id: string;
  name: string;
  matchedProductId: string | null;
  sku: string;
  category: string;
  unit: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
  taxAmount: number;
  invoiceDiscountPercentage: number;
  invoiceDiscountAmount: number;
  lineTotal: number;
  confidence: number;
  included: boolean;
  sellingPrice: number;
  discountPercentage: number | null;
  mrp: number | null;
  description: string;
  hsnSac: string;
  showPitchInput?: boolean;
}

function Step({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <span className={`grid size-7 sm:size-8 place-items-center rounded-full text-xs font-bold ${active ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>
        {done ? <Icon name="check" size={14} /> : number}
      </span>
      <span className={`text-xs sm:text-sm font-semibold truncate ${active ? "text-slate-800" : "text-slate-400"}`}>{label}</span>
    </div>
  );
}

function Line({ active }: { active: boolean }) {
  return <div className={`mx-1.5 sm:mx-3 h-px max-w-8 sm:max-w-24 flex-1 min-w-3 ${active ? "bg-emerald-600" : "bg-slate-200"}`} />;
}

function InvoiceScanner() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successResult, setSuccessResult] = useState<PurchaseInvoiceDto | null>(null);

  const [availableProducts, setAvailableProducts] = useState<ProductMatchDto[]>([]);
  const [sourceFileUrl, setSourceFileUrl] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("Sample Invoice");
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [supplierName, setSupplierName] = useState("Skynet Computer");
  const [supplierGstin, setSupplierGstin] = useState("TOALQPTS655B123");
  const [supplierPhone, setSupplierPhone] = useState("9135125553");
  const [buyerName, setBuyerName] = useState("Apna Electronics");
  const [buyerGstin, setBuyerGstin] = useState("108WXPS0381J3Z2");
  const [invoiceNumber, setInvoiceNumber] = useState("AMZ26270106");
  const [invoiceDate, setInvoiceDate] = useState("2026-06-04");
  const [paymentMode, setPaymentMode] = useState("CREDIT");
  const [subtotal, setSubtotal] = useState(134324.99);
  const [taxAmount, setTaxAmount] = useState(20490.25);
  const [grandTotal, setGrandTotal] = useState(134325.0);

  const [duplicateConflict, setDuplicateConflict] = useState<DuplicateInvoiceConflictDetails | null>(null);

  const [items, setItems] = useState<ReviewItem[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file?: File | null) => {
    setError("");
    setLoading(true);

    if (file) {
      setFileName(file.name);
      if (file.type.startsWith("image/")) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(null);
      }
    } else {
      setFileName("Sample Invoice");
      setFilePreview(null);
    }

    try {
      const response = await scanInvoiceFile(file);
      const invData = response.invoiceData;
      setAvailableProducts(response.availableProducts || []);
      setSourceFileUrl(response.sourceFileUrl || null);

      if (invData.sellerName) setSupplierName(invData.sellerName);
      if (invData.sellerGstin) setSupplierGstin(invData.sellerGstin);
      if (invData.buyerName) setBuyerName(invData.buyerName);
      if (invData.buyerGstin) setBuyerGstin(invData.buyerGstin);
      if (invData.invoiceNumber) setInvoiceNumber(invData.invoiceNumber);
      if (invData.invoiceDate) setInvoiceDate(invData.invoiceDate);
      if (invData.paymentMode) setPaymentMode(invData.paymentMode.toUpperCase());
      if (invData.subTotal !== undefined && invData.subTotal !== null) setSubtotal(Number(invData.subTotal));
      if (invData.totalTaxAmount !== undefined && invData.totalTaxAmount !== null) setTaxAmount(Number(invData.totalTaxAmount));
      
      const billFinalAmount = invData.totalAmount !== undefined && invData.totalAmount !== null
        ? Number(invData.totalAmount)
        : invData.grandTotal !== undefined && invData.grandTotal !== null
        ? Number(invData.grandTotal)
        : null;
      if (billFinalAmount !== null && !isNaN(billFinalAmount)) {
        setGrandTotal(billFinalAmount);
      }

      const reviewItems: ReviewItem[] = (invData.items || []).map((item, index) => {
        const itemLower = (item.itemName || "").toLowerCase();
        const matched = (response.availableProducts || []).find(
          (p) => p.name.toLowerCase() === itemLower || itemLower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(itemLower)
        );

        const cost = Number(item.pricePerUnit) || 0;
        const defaultSelling = matched ? matched.sellingPrice : Math.round(cost * 1.25);
        const defaultMrp = matched && matched.mrp ? matched.mrp : Math.round(cost * 1.35);

        const invDiscPct = item.discountPercentage !== undefined && item.discountPercentage !== null ? Number(item.discountPercentage) : 0;
        const invDiscAmt = item.discountAmount !== undefined && item.discountAmount !== null ? Number(item.discountAmount) : 0;
        const directLineTotal = item.totalAmount !== undefined && item.totalAmount !== null && !isNaN(Number(item.totalAmount))
          ? Number(item.totalAmount)
          : Math.round((cost * (Number(item.quantity) || 1)) * 100) / 100;

        return {
          id: `item-${index}-${Date.now()}`,
          name: item.itemName,
          matchedProductId: matched ? matched.id : null,
          sku: matched ? matched.sku : "",
          category: "General",
          unit: item.unit || "Nos",
          quantity: Number(item.quantity) || 1,
          unitCost: cost,
          taxRate: item.gstPercentage ? Number(item.gstPercentage) : 18,
          taxAmount: item.gstAmount ? Number(item.gstAmount) : 0,
          invoiceDiscountPercentage: invDiscPct,
          invoiceDiscountAmount: invDiscAmt,
          lineTotal: directLineTotal,
          confidence: item.confidenceScore ? Math.round(Number(item.confidenceScore) * 100) : 92,
          included: true,
          sellingPrice: defaultSelling,
          discountPercentage: invDiscPct > 0 ? invDiscPct : null,
          mrp: defaultMrp,
          description: "",
          hsnSac: item.hsnSac || "",
          showPitchInput: false,
        };
      });

      setItems(reviewItems);
      setStep(2);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to scan invoice. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const syncTotalsFromItems = () => {
    const included = items.filter((x) => x.included);
    const sub = included.reduce((acc, x) => {
      const base = x.quantity * x.unitCost;
      const disc = x.invoiceDiscountAmount || (x.invoiceDiscountPercentage ? (base * x.invoiceDiscountPercentage) / 100 : 0);
      return acc + (base - disc);
    }, 0);
    const tax = included.reduce((acc, x) => acc + (x.taxAmount || 0), 0);
    const grand = included.reduce((acc, x) => acc + (x.lineTotal || 0), 0);
    setSubtotal(Math.round(sub * 100) / 100);
    setTaxAmount(Math.round(tax * 100) / 100);
    setGrandTotal(Math.round(grand * 100) / 100);
  };

  const updateItem = (index: number, key: keyof ReviewItem, val: any) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const updated = { ...it, [key]: val };
        if (key === "matchedProductId") {
          const selected = availableProducts.find((p) => p.id === val);
          if (selected) {
            updated.sku = selected.sku;
            updated.sellingPrice = selected.sellingPrice;
            if (selected.mrp) updated.mrp = selected.mrp;
          }
        }
        if (key === "quantity" || key === "unitCost" || key === "invoiceDiscountPercentage" || key === "invoiceDiscountAmount" || key === "taxRate") {
          const qty = key === "quantity" ? Number(val) : it.quantity;
          const cost = key === "unitCost" ? Number(val) : it.unitCost;
          const base = qty * cost;
          let disc = 0;
          if (key === "invoiceDiscountPercentage") {
            const pct = Number(val) || 0;
            disc = (base * pct) / 100;
            updated.invoiceDiscountAmount = Math.round(disc * 100) / 100;
          } else if (key === "invoiceDiscountAmount") {
            disc = Number(val) || 0;
            if (base > 0) {
              updated.invoiceDiscountPercentage = Math.round((disc / base) * 100 * 10) / 10;
            }
          } else {
            disc = it.invoiceDiscountPercentage ? (base * it.invoiceDiscountPercentage) / 100 : it.invoiceDiscountAmount;
          }
          const taxRate = key === "taxRate" ? Number(val) : it.taxRate;
          const taxable = Math.max(0, base - disc);
          const tax = taxRate ? (taxable * taxRate) / 100 : 0;
          updated.taxAmount = Math.round(tax * 100) / 100;
          updated.lineTotal = Math.round((taxable + tax) * 100) / 100;
        }
        return updated;
      })
    );
  };

  const handleConfirmSave = async (forceUpdate = false) => {
    const includedItems = items.filter((x) => x.included);
    if (includedItems.length === 0) {
      setError("Please select at least one item to import.");
      return;
    }

    for (const item of includedItems) {
      if (!item.sellingPrice || item.sellingPrice <= 0) {
        setError(`Please specify a valid selling price for "${item.name}".`);
        return;
      }
    }

    setError("");
    setSaving(true);

    try {
      const payload: SavePurchaseInvoicePayload = {
        invoiceNumber: invoiceNumber.trim() || `INV-${Date.now()}`,
        invoiceDate: invoiceDate || new Date().toISOString().split("T")[0],
        paymentMode: paymentMode || "CREDIT",
        supplierName: supplierName.trim() || "Unknown Supplier",
        supplierGstin: supplierGstin.trim() || undefined,
        supplierPhone: supplierPhone.trim() || undefined,
        buyerName: buyerName.trim() || undefined,
        buyerGstin: buyerGstin.trim() || undefined,
        subtotal: subtotal,
        taxAmount: taxAmount,
        totalAmount: grandTotal,
        sourceFileUrl: sourceFileUrl || undefined,
        updateExisting: forceUpdate,
        items: includedItems.map((item) => {
          let effDiscountPrice: number | undefined = undefined;
          if (item.discountPercentage !== null && item.discountPercentage > 0) {
            effDiscountPrice = Math.round(item.sellingPrice * (1 - item.discountPercentage / 100) * 100) / 100;
          }

          let discountAmountToSave = item.invoiceDiscountAmount;
          if ((!discountAmountToSave || discountAmountToSave === 0) && item.discountPercentage !== null && item.discountPercentage > 0) {
            discountAmountToSave = Math.round((item.unitCost * item.quantity * item.discountPercentage) / 100 * 100) / 100;
          }

          return {
            matchedProductId: item.matchedProductId || undefined,
            name: item.name.trim(),
            sku: item.sku.trim() || undefined,
            category: item.category.trim() || undefined,
            unit: item.unit.trim() || undefined,
            quantity: item.quantity,
            unitCost: item.unitCost,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            discountPercentage: item.discountPercentage !== null ? item.discountPercentage : undefined,
            discountAmount: discountAmountToSave,
            lineTotal: item.lineTotal,
            matchConfidence: item.confidence ? item.confidence / 100 : undefined,
            sellingPrice: item.sellingPrice,
            discountPrice: effDiscountPrice,
            mrp: item.mrp !== null ? item.mrp : undefined,
            description: item.description.trim() || undefined,
            hsnSac: item.hsnSac.trim() || undefined,
          };
        }),
      };

      const saved = await savePurchaseInvoice(payload);
      setDuplicateConflict(null);
      setSuccessResult(saved);
      setStep(3);
    } catch (err: unknown) {
      if (err instanceof DuplicateInvoiceError) {
        setDuplicateConflict(err.conflictDetails);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save purchase invoice.");
      }
    } finally {
      setSaving(false);
    }
  };

  const activeItems = items.filter((x) => x.included);
  const totalUnits = activeItems.reduce((acc, x) => acc + x.quantity, 0);
  const totalCostValue = activeItems.reduce((acc, x) => acc + x.lineTotal, 0);
  const totalRetailValue = activeItems.reduce((acc, x) => {
    const effPrice = x.discountPercentage !== null && x.discountPercentage > 0
      ? x.sellingPrice * (1 - x.discountPercentage / 100)
      : x.sellingPrice;
    return acc + x.quantity * effPrice;
  }, 0);

  return (
    <>
      <PageHeader
        title="Invoice Scanner"
        description="Extract supplier invoices, review selling prices & pitches, and post directly to inventory."
      />

      <div className="mb-5 flex items-center justify-between sm:justify-start overflow-x-auto pb-1">
        <Step number={1} label="Scan" active={step >= 1} done={step > 1} />
        <Line active={step > 1} />
        <Step number={2} label="Review & Pricing" active={step >= 2} done={step > 2} />
        <Line active={step > 2} />
        <Step number={3} label="Saved" active={step >= 3} done={step === 3} />
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
          <Icon className="shrink-0" name="warning" size={16} />
          <span>{error}</span>
        </div>
      )}

      {step === 1 && (
        loading ? (
          <InvoiceScanningOverlay fileName={fileName} filePreview={filePreview} />
        ) : (
          <Card className="p-5">
            <div className="grid min-h-[460px] gap-6 lg:grid-cols-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="group grid place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition hover:border-emerald-500 hover:bg-emerald-50/20"
                disabled={loading}
              >
                <input
                  ref={fileRef}
                  className="hidden"
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
                <div>
                  <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 transition group-hover:scale-105">
                    <Icon name="scan" size={30} />
                  </span>
                  <h2 className="mt-4 text-base font-bold text-slate-900">Upload supplier invoice</h2>
                  <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-500">
                    Select a PNG, JPG, or PDF purchase invoice. Multi-modal AI will extract vendor information, line items, rates, discounts and taxes.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      disabled={loading}
                      onClick={(e) => {
                        e.stopPropagation();
                        fileRef.current?.click();
                      }}
                    >
                      <Icon name="upload" size={16} />
                      {loading ? "Extracting invoice…" : "Select Invoice File"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={loading}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileUpload(null);
                      }}
                    >
                      Load Sample Invoice
                    </Button>
                  </div>
                </div>
              </button>

              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6">
                <div>
                  <h3 className="font-bold text-slate-900">Automated Intake Process</h3>
                  <div className="mt-5 space-y-4">
                    <div className="flex gap-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">1</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">OCR & Document Parsing</h4>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">Extracts seller, buyer (Bill To), HSN/SAC codes, row discounts, GST %, and totals.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">2</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Catalogue Matching & Pricing Review</h4>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">Matches existing products. Set Selling Price, MRP, Retail Discount %, editable line totals, and pitch descriptions.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">3</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Instant Inventory & Cost Ledger Update</h4>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">Increments stock on hand, recalculates weighted average purchase cost, and writes stock movement entries.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-900">Review & Set Retail Pricing</h2>
                  <Badge tone="success">Extracted</Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {items.length} items extracted from {fileName}. Adjust selling price, MRP, discount percentage, line totals, and optional pitch descriptions.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Button variant="secondary" className="flex-1 sm:flex-initial text-xs sm:text-sm" onClick={() => setShowPreviewModal(true)}>
                  <Icon name="file" size={15} />
                  View Original Document
                </Button>
                <Button variant="ghost" className="text-xs sm:text-sm" onClick={() => setStep(1)}>
                  Rescan
                </Button>
              </div>
            </div>

            <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-semibold text-slate-600">
                Seller (Supplier)
                <Input className="mt-1" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Seller GSTIN
                <Input className="mt-1" value={supplierGstin} onChange={(e) => setSupplierGstin(e.target.value)} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Buyer (Bill To)
                <Input className="mt-1" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Buyer GSTIN
                <Input className="mt-1" value={buyerGstin} onChange={(e) => setBuyerGstin(e.target.value)} />
              </label>

              <label className="text-xs font-semibold text-slate-600">
                Invoice Number
                <Input className="mt-1" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Invoice Date
                <Input className="mt-1" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Payment Mode
                <Select className="mt-1 w-full" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                  <option value="CREDIT">CREDIT</option>
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                </Select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Supplier Phone
                <Input className="mt-1" value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} />
              </label>
            </div>

            <div className="grid gap-3 border-b border-slate-100 bg-emerald-50/40 p-3 sm:grid-cols-4 text-xs">
              <label className="font-semibold text-slate-700">
                Sub Total (₹)
                <Input
                  className="mt-1 bg-white font-bold text-slate-900"
                  type="number"
                  step="0.01"
                  value={subtotal}
                  onChange={(e) => setSubtotal(Number(e.target.value))}
                />
              </label>
              <label className="font-semibold text-slate-700">
                Total GST / Tax (₹)
                <Input
                  className="mt-1 bg-white font-bold text-slate-900"
                  type="number"
                  step="0.01"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(Number(e.target.value))}
                />
              </label>
              <label className="font-semibold text-slate-700">
                Grand Total (₹)
                <Input
                  className="mt-1 bg-white font-bold text-emerald-800"
                  type="number"
                  step="0.01"
                  value={grandTotal}
                  onChange={(e) => setGrandTotal(Number(e.target.value))}
                />
              </label>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full text-xs"
                  onClick={syncTotalsFromItems}
                >
                  <Icon name="refresh" size={14} />
                  Recalculate from Items
                </Button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <div key={item.id} className={`p-4 transition ${!item.included ? "bg-slate-50/60 opacity-60" : "hover:bg-slate-50/30"}`}>
                  <div className="flex items-start gap-3">
                    <input
                      checked={item.included}
                      className="mt-2 size-4 accent-emerald-600"
                      type="checkbox"
                      onChange={(e) => updateItem(index, "included", e.target.checked)}
                    />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
                          <Input
                            className="h-8 max-w-sm font-semibold text-slate-900"
                            value={item.name}
                            onChange={(e) => updateItem(index, "name", e.target.value)}
                          />
                          <Badge tone={item.confidence >= 90 ? "success" : item.confidence >= 70 ? "info" : "warning"}>
                            {item.confidence}% Match
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                            onClick={() => updateItem(index, "showPitchInput", !item.showPitchInput)}
                          >
                            {item.showPitchInput ? "Hide Pitch Notes" : "+ Add Pitch Description"}
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-8">
                        <label className="text-[11px] font-semibold text-slate-600 sm:col-span-2 lg:col-span-2">
                          Matched Shop Product
                          <Select
                            className="mt-1 w-full text-xs"
                            value={item.matchedProductId || ""}
                            onChange={(e) => updateItem(index, "matchedProductId", e.target.value || null)}
                          >
                            <option value="">Create as new product</option>
                            {availableProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku}) - Current Stock: {p.stock}
                              </option>
                            ))}
                          </Select>
                        </label>

                        <label className="text-[11px] font-semibold text-slate-600">
                          HSN / SAC
                          <Input
                            className="mt-1 text-xs"
                            placeholder="HSN code"
                            value={item.hsnSac}
                            onChange={(e) => updateItem(index, "hsnSac", e.target.value)}
                          />
                        </label>

                        <label className="text-[11px] font-semibold text-slate-600">
                          Qty & Unit
                          <div className="mt-1 flex gap-1">
                            <Input
                              className="w-1/2 min-w-0 text-xs"
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                            />
                            <Input
                              className="w-1/2 min-w-0 text-xs"
                              value={item.unit}
                              onChange={(e) => updateItem(index, "unit", e.target.value)}
                            />
                          </div>
                        </label>

                        <label className="text-[11px] font-semibold text-slate-600">
                          Buying Cost (₹)
                          <Input
                            className="mt-1 text-xs font-semibold"
                            type="number"
                            step="0.01"
                            value={item.unitCost}
                            onChange={(e) => updateItem(index, "unitCost", Number(e.target.value))}
                          />
                        </label>

                        <label className="text-[11px] font-semibold text-slate-600">
                          Bill Disc (% / ₹)
                          <div className="mt-1 flex gap-1">
                            <Input
                              className="w-1/2 min-w-0 text-xs"
                              type="number"
                              step="0.1"
                              placeholder="%"
                              value={item.invoiceDiscountPercentage || ""}
                              onChange={(e) => updateItem(index, "invoiceDiscountPercentage", Number(e.target.value))}
                            />
                            <Input
                              className="w-1/2 min-w-0 text-xs"
                              type="number"
                              step="0.01"
                              placeholder="₹"
                              value={item.invoiceDiscountAmount || ""}
                              onChange={(e) => updateItem(index, "invoiceDiscountAmount", Number(e.target.value))}
                            />
                          </div>
                        </label>

                        <label className="text-[11px] font-semibold text-slate-600">
                          GST (% / ₹)
                          <div className="mt-1 flex gap-1">
                            <Input
                              className="w-1/2 min-w-0 text-xs"
                              type="number"
                              placeholder="%"
                              value={item.taxRate}
                              onChange={(e) => updateItem(index, "taxRate", Number(e.target.value))}
                            />
                            <Input
                              className="w-1/2 min-w-0 text-xs"
                              type="number"
                              step="0.01"
                              placeholder="₹"
                              value={item.taxAmount}
                              onChange={(e) => updateItem(index, "taxAmount", Number(e.target.value))}
                            />
                          </div>
                        </label>

                        <label className="text-[11px] font-bold text-slate-700">
                          Line Total (₹)
                          <Input
                            className="mt-1 text-xs font-bold text-slate-900 border-slate-300"
                            type="number"
                            step="0.01"
                            value={item.lineTotal}
                            onChange={(e) => updateItem(index, "lineTotal", Number(e.target.value))}
                          />
                        </label>
                      </div>

                      <div className="grid gap-3 rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-[11px] font-bold text-emerald-700">
                          Selling Price (₹) <span className="text-rose-500">*</span>
                          <Input
                            className="mt-1 border-emerald-300 bg-white text-xs font-bold text-emerald-800 focus:border-emerald-600"
                            type="number"
                            step="0.01"
                            value={item.sellingPrice}
                            onChange={(e) => updateItem(index, "sellingPrice", Number(e.target.value))}
                            required
                          />
                        </label>

                        <label className="text-[11px] font-semibold text-slate-600">
                          MRP (₹) <span className="font-normal text-slate-400">(optional)</span>
                          <Input
                            className="mt-1 text-xs"
                            type="number"
                            step="0.01"
                            placeholder="Optional"
                            value={item.mrp !== null ? item.mrp : ""}
                            onChange={(e) => updateItem(index, "mrp", e.target.value ? Number(e.target.value) : null)}
                          />
                        </label>

                        <label className="text-[11px] font-semibold text-slate-600">
                          <div className="flex items-center justify-between">
                            <span>Retail Discount (%)</span>
                            {item.invoiceDiscountPercentage > 0 && (
                              <button
                                type="button"
                                className="text-[10px] font-medium text-emerald-700 underline"
                                onClick={() => updateItem(index, "discountPercentage", item.invoiceDiscountPercentage)}
                              >
                                Use Bill ({item.invoiceDiscountPercentage}%)
                              </button>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <Input
                              className="text-xs"
                              type="number"
                              step="0.1"
                              placeholder="0%"
                              value={item.discountPercentage !== null ? item.discountPercentage : ""}
                              onChange={(e) => updateItem(index, "discountPercentage", e.target.value ? Number(e.target.value) : null)}
                            />
                            {item.discountPercentage !== null && item.discountPercentage > 0 && (
                              <span className="whitespace-nowrap text-[10px] font-bold text-emerald-700">
                                Effective: {currency(Math.round(item.sellingPrice * (1 - item.discountPercentage / 100) * 100) / 100)}
                              </span>
                            )}
                          </div>
                        </label>

                        <label className="text-[11px] font-semibold text-slate-600">
                          SKU Code
                          <Input
                            className="mt-1 text-xs"
                            placeholder="Auto generated"
                            value={item.sku}
                            onChange={(e) => updateItem(index, "sku", e.target.value)}
                          />
                        </label>
                      </div>

                      {item.showPitchInput && (
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Product Description / AI Pitch Hook <span className="font-normal text-slate-400">(optional)</span>
                            <textarea
                              className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                              rows={2}
                              placeholder="e.g. Inverter battery with 48 months warranty, ideal for power cuts and heavy commercial loads."
                              value={item.description}
                              onChange={(e) => updateItem(index, "description", e.target.value)}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col justify-between gap-3 border-t border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span><strong>{activeItems.length}</strong> items selected</span>
                <span>•</span>
                <span><strong>{totalUnits}</strong> total units</span>
                <span>•</span>
                <span>Total Amount: <strong className="text-slate-900">{currency(grandTotal)}</strong></span>
                <span>•</span>
                <span>Retail Value: <strong className="text-emerald-700">{currency(totalRetailValue)}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button disabled={saving || activeItems.length === 0} onClick={() => handleConfirmSave(false)}>
                  <Icon name="check" size={16} />
                  {saving ? "Posting to inventory…" : "Confirm & Post to Inventory"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {step === 3 && successResult && (
        <Card className="mx-auto max-w-xl p-8 text-center sm:p-10">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Icon name="check" size={32} />
          </span>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">Purchase Invoice Posted</h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500">
            Invoice {successResult.invoiceNumber} has been recorded into your database. Stock levels and weighted average purchase costs have been updated.
          </p>

          <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50 text-left text-xs">
            <div className="flex justify-between p-3">
              <span className="text-slate-500">Invoice Number</span>
              <strong className="text-slate-900">{successResult.invoiceNumber}</strong>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-slate-500">Supplier</span>
              <strong className="text-slate-900">{successResult.supplierName}</strong>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-slate-500">Line Items Imported</span>
              <strong className="text-slate-900">{successResult.itemsCount} products</strong>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-slate-500">Total Purchase Value</span>
              <strong className="text-emerald-700">{currency(Number(successResult.totalAmount))}</strong>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-slate-500">Status</span>
              <Badge tone="success">{successResult.status}</Badge>
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <Button
              onClick={() => {
                setSuccessResult(null);
                setItems([]);
                setStep(1);
              }}
            >
              <Icon name="scan" size={16} />
              Scan Another Invoice
            </Button>
          </div>
        </Card>
      )}

      {showPreviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={() => setShowPreviewModal(false)}
        >
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-hidden shadow-2xl">
            <div onMouseDown={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <div>
                  <h3 className="font-bold text-slate-900">Original Invoice Document</h3>
                  <p className="text-xs text-slate-500">{fileName}</p>
                </div>
                <Button variant="ghost" onClick={() => setShowPreviewModal(false)}>
                  <Icon name="close" size={16} />
                </Button>
              </div>

              <div className="max-h-[70vh] overflow-auto p-4">
                {filePreview ? (
                  <img
                    src={filePreview}
                    alt="Invoice Preview"
                    className="mx-auto rounded-lg border border-slate-200 object-contain shadow-sm"
                  />
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-xs text-slate-700">
                    <div className="border-b-2 border-slate-900 pb-3 text-center">
                      <h4 className="text-base font-extrabold uppercase">{supplierName}</h4>
                      <p className="text-[10px] text-slate-500">GSTIN: {supplierGstin} • Phone: {supplierPhone}</p>
                    </div>
                    <div className="my-3 flex justify-between text-[11px]">
                      <div>
                        <strong>Invoice: {invoiceNumber}</strong>
                        <p>Date: {invoiceDate}</p>
                      </div>
                      <div className="text-right">
                        <strong>Bill To: {buyerName}</strong>
                        <p>GSTIN: {buyerGstin}</p>
                      </div>
                    </div>
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-200/60">
                        <tr>
                          <th className="p-2">Item</th>
                          <th className="p-2">HSN</th>
                          <th className="p-2">Qty</th>
                          <th className="p-2">Rate</th>
                          <th className="p-2">GST</th>
                          <th className="p-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {items.map((it) => (
                          <tr key={it.id}>
                            <td className="p-2 font-medium">{it.name}</td>
                            <td className="p-2 text-slate-500">{it.hsnSac || "-"}</td>
                            <td className="p-2">{it.quantity} {it.unit}</td>
                            <td className="p-2">{currency(it.unitCost)}</td>
                            <td className="p-2">{it.taxRate}%</td>
                            <td className="p-2 font-semibold">{currency(it.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 flex justify-between border-t border-slate-300 pt-2 text-xs">
                      <div>
                        <span className="text-slate-500">Subtotal:</span> {currency(subtotal)} • <span className="text-slate-500">Tax:</span> {currency(taxAmount)}
                      </div>
                      <div className="font-bold text-slate-900">
                        Total Amount: {currency(grandTotal)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end border-t border-slate-100 p-3">
                <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {duplicateConflict && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={() => !saving && setDuplicateConflict(null)}
        >
          <Card className="w-full max-w-lg overflow-hidden shadow-2xl">
            <div onMouseDown={(e) => e.stopPropagation()} className="p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
                  <Icon name="warning" size={24} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Invoice Already Exists</h3>
                  <p className="text-xs text-slate-500">Duplicate invoice detected for this supplier</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-slate-700">
                <p className="leading-5">
                  An invoice with number <strong className="font-semibold text-slate-900">{duplicateConflict.invoiceNumber}</strong> from <strong className="font-semibold text-slate-900">{duplicateConflict.supplierName}</strong> was already registered on <strong className="font-semibold text-slate-900">{duplicateConflict.invoiceDate}</strong> for <strong className="font-semibold text-slate-900">{currency(Number(duplicateConflict.totalAmount))}</strong>.
                </p>
                <p className="mt-2 text-slate-600">
                  Would you like to update this existing invoice with the current products, pricing, and quantities? Updating preserves the original creation audit trail while recalculating inventory quantities and stock movements.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <Button
                  variant="secondary"
                  disabled={saving}
                  onClick={() => setDuplicateConflict(null)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={saving}
                  onClick={() => handleConfirmSave(true)}
                >
                  <Icon name="refresh" size={16} />
                  {saving ? "Updating invoice…" : "Update Existing Invoice"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function InvoicesScreen({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [invoices, setInvoices] = useState<PurchaseInvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoiceDetailDto | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [billModalData, setBillModalData] = useState<{ url: string; title: string; isPdf: boolean } | null>(null);
  const [loadingBill, setLoadingBill] = useState(false);

  const loadInvoices = () => {
    setLoading(true);
    fetchPurchaseInvoices()
      .then(res => {
        setInvoices(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleViewBillImage = async (invoiceId: string, invoiceNum: string) => {
    setLoadingBill(true);
    try {
      const { blob, contentType } = await fetchInvoiceFileBlob(invoiceId);
      const objectUrl = URL.createObjectURL(blob);
      const isPdf = contentType.includes("pdf") || blob.type.includes("pdf");
      setBillModalData({
        url: objectUrl,
        title: `Bill for Invoice ${invoiceNum}`,
        isPdf,
      });
    } catch (err: unknown) {
      alert("Unable to load original invoice bill file.");
    } finally {
      setLoadingBill(false);
    }
  };

  const handleCloseBillModal = () => {
    if (billModalData?.url) {
      URL.revokeObjectURL(billModalData.url);
    }
    setBillModalData(null);
  };

  const handleOpenDetail = async (id: string) => {
    setLoadingDetail(true);
    setDetailError("");
    try {
      const data = await fetchPurchaseInvoiceById(id);
      setSelectedInvoice(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setDetailError(err.message);
      } else {
        setDetailError("Failed to fetch invoice details.");
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const q = query.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.supplierName && inv.supplierName.toLowerCase().includes(q))
      );
    });
  }, [invoices, query]);

  const totalSpent = useMemo(() => invoices.reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0), [invoices]);
  const totalItems = useMemo(() => invoices.reduce((acc, inv) => acc + (inv.itemsCount || 0), 0), [invoices]);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="All recorded supplier purchase invoices, items, and audit history."
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="secondary" className="flex-1 sm:flex-initial text-xs sm:text-sm" onClick={loadInvoices}>
              <Icon name="refresh" size={16} />
              Refresh
            </Button>
            <Button className="flex-1 sm:flex-initial text-xs sm:text-sm" onClick={() => onNavigate("Invoice Scanner")}>
              <Icon name="scan" size={16} />
              Scan New Invoice
            </Button>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <MetricCard title="Total Purchase Invoices" value={String(invoices.length)} meta="Recorded in ledger" icon="file" tone="blue" />
        <MetricCard title="Total Inward Spend" value={currency(totalSpent)} meta="Cumulative purchase value" icon="report" tone="emerald" />
        <MetricCard title="Total Products Inwarded" value={String(totalItems)} meta="Stock units received" icon="box" />
      </div>
      <Card>
        <div className="flex gap-3 border-b border-slate-100 p-4">
          <div className="relative flex-1">
            <Icon className="absolute left-3 top-2.5 text-slate-400" name="search" size={16} />
            <Input
              className="pl-9"
              placeholder="Search by invoice number or supplier name..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>
        {loading ? (
          <div className="p-16 text-center text-sm text-slate-500">Loading purchase invoices from database...</div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center py-20 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400">
              <Icon name="file" />
            </span>
            <h3 className="mt-3 font-bold text-slate-800">No purchase invoices found</h3>
            <p className="mt-1 text-sm text-slate-500">Scan or add your first supplier bill using the Invoice Scanner.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Invoice #</th>
                  <th className="px-5 py-3 font-semibold">Supplier</th>
                  <th className="px-5 py-3 font-semibold">Invoice Date</th>
                  <th className="px-5 py-3 font-semibold">Items</th>
                  <th className="px-5 py-3 font-semibold">Total Amount</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(inv => (
                  <tr className="hover:bg-slate-50 transition cursor-pointer" key={inv.id} onClick={() => handleOpenDetail(inv.id)}>
                    <td className="px-5 py-4 font-semibold text-emerald-700">{inv.invoiceNumber}</td>
                    <td className="px-5 py-4 text-slate-700">{inv.supplierName}</td>
                    <td className="px-5 py-4 text-slate-500">{inv.invoiceDate}</td>
                    <td className="px-5 py-4 font-medium text-slate-600">{inv.itemsCount} items</td>
                    <td className="px-5 py-4 font-bold text-slate-900">{currency(Number(inv.totalAmount))}</td>
                    <td className="px-5 py-4">
                      <Badge tone={inv.status === "COMPLETED" || inv.status === "POSTED" ? "success" : "info"}>{inv.status}</Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.sourceFileUrl && (
                          <Button
                            variant="secondary"
                            className="text-xs px-2.5 py-1 text-slate-700"
                            disabled={loadingBill}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewBillImage(inv.id, inv.invoiceNumber);
                            }}
                            title="View original scanned invoice document"
                          >
                            <Icon name="file" size={14} />
                            Bill Image
                          </Button>
                        )}
                        <Button variant="ghost" className="text-xs px-2.5 py-1" onClick={(e) => { e.stopPropagation(); handleOpenDetail(inv.id); }}>
                          Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={() => setSelectedInvoice(null)}
        >
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
            <div onMouseDown={(e) => e.stopPropagation()} className="flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">Invoice {selectedInvoice.invoiceNumber}</h3>
                    <Badge tone="success">{selectedInvoice.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{selectedInvoice.supplierName} • {selectedInvoice.invoiceDate}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedInvoice.sourceFileUrl && (
                    <Button
                      variant="secondary"
                      className="text-xs px-3 py-1.5"
                      disabled={loadingBill}
                      onClick={() => handleViewBillImage(selectedInvoice.id, selectedInvoice.invoiceNumber)}
                    >
                      <Icon name="file" size={14} />
                      View Original Bill
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setSelectedInvoice(null)}>
                    <Icon name="close" size={16} />
                  </Button>
                </div>
              </div>

              <div className="overflow-y-auto p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block">Supplier</span>
                    <strong className="text-slate-800">{selectedInvoice.supplierName}</strong>
                    {selectedInvoice.supplierGstin && <p className="text-[10px] text-slate-500 font-mono">GSTIN: {selectedInvoice.supplierGstin}</p>}
                  </div>
                  <div>
                    <span className="text-slate-400 block">Invoice Date</span>
                    <strong className="text-slate-800">{selectedInvoice.invoiceDate}</strong>
                    {selectedInvoice.paymentMode && <p className="text-[10px] text-slate-500">Mode: {selectedInvoice.paymentMode}</p>}
                  </div>
                  <div>
                    <span className="text-slate-400 block">Created Timestamp</span>
                    <strong className="text-slate-800">{new Date(selectedInvoice.createdAt).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Amount</span>
                    <strong className="text-emerald-700 text-sm font-extrabold">{currency(Number(selectedInvoice.totalAmount))}</strong>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Invoice Line Items ({selectedInvoice.items.length})</h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/70 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Item</th>
                          <th className="p-2.5">Qty</th>
                          <th className="p-2.5">Unit Cost</th>
                          <th className="p-2.5">Discount</th>
                          <th className="p-2.5">GST</th>
                          <th className="p-2.5 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedInvoice.items.map((it) => (
                          <tr key={it.id}>
                            <td className="p-2.5">
                              <p className="font-semibold text-slate-800">{it.productName}</p>
                              {it.sku && <span className="text-[10px] text-slate-400 font-mono">SKU: {it.sku}</span>}
                            </td>
                            <td className="p-2.5">{it.quantity}</td>
                            <td className="p-2.5">{currency(Number(it.unitCost))}</td>
                            <td className="p-2.5 text-slate-500">{it.discountAmount ? currency(Number(it.discountAmount)) : "-"}</td>
                            <td className="p-2.5 text-slate-500">{it.taxRate ? `${it.taxRate}%` : "-"}</td>
                            <td className="p-2.5 font-bold text-slate-900 text-right">{currency(Number(it.lineTotal))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-2 text-xs">
                  <div className="space-y-1 text-right min-w-[200px]">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span>{currency(Number(selectedInvoice.subtotal))}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Tax Amount:</span>
                      <span>{currency(Number(selectedInvoice.taxAmount))}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1 text-sm">
                      <span>Grand Total:</span>
                      <span className="text-emerald-700">{currency(Number(selectedInvoice.totalAmount))}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 p-3 bg-slate-50">
                <div>
                  {selectedInvoice.sourceFileUrl ? (
                    <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                      <Icon name="check" size={14} />
                      Original Bill Image Attached
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">No original bill image uploaded</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedInvoice.sourceFileUrl && (
                    <Button
                      variant="secondary"
                      disabled={loadingBill}
                      onClick={() => handleViewBillImage(selectedInvoice.id, selectedInvoice.invoiceNumber)}
                    >
                      <Icon name="file" size={15} />
                      View Bill
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {billModalData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onMouseDown={handleCloseBillModal}
        >
          <Card className="max-h-[92vh] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col">
            <div onMouseDown={(e) => e.stopPropagation()} className="flex flex-col max-h-[92vh]">
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
                    <Icon name="file" size={16} />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">{billModalData.title}</h3>
                    <p className="text-xs text-slate-500 font-medium">Secured bill preview</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={billModalData.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Open Fullscreen
                  </a>
                  <Button variant="ghost" onClick={handleCloseBillModal}>
                    <Icon name="close" size={16} />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-slate-900/5 p-4 flex items-center justify-center min-h-[350px]">
                {billModalData.isPdf ? (
                  <iframe
                    src={billModalData.url}
                    className="w-full h-[70vh] rounded-lg border border-slate-200 bg-white"
                    title="Invoice PDF"
                  />
                ) : (
                  <img
                    src={billModalData.url}
                    alt="Original Invoice Bill"
                    className="max-h-[72vh] max-w-full rounded-lg object-contain shadow-md border border-slate-200 bg-white"
                  />
                )}
              </div>

              <div className="flex justify-end border-t border-slate-100 p-3 bg-slate-50">
                <Button variant="secondary" onClick={handleCloseBillModal}>
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", gstin: "" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const loadSuppliers = () => {
    setLoading(true);
    fetchSuppliers()
      .then(res => {
        setSuppliers(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleCreateSupplier = async () => {
    if (!form.name.trim()) {
      setErr("Supplier name is required");
      return;
    }
    setSubmitting(true);
    setErr("");
    try {
      await createSupplier(form);
      setShowAddModal(false);
      setForm({ name: "", phone: "", gstin: "" });
      loadSuppliers();
    } catch (e: any) {
      setErr(e.message || "Failed to create supplier");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return suppliers.filter(s => {
      const q = query.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.gstin && s.gstin.toLowerCase().includes(q))
      );
    });
  }, [suppliers, query]);

  const totalSpendAll = useMemo(() => suppliers.reduce((acc, s) => acc + Number(s.totalSpend || 0), 0), [suppliers]);

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="View your active suppliers, GSTIN numbers, contact details, and historical spend."
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="secondary" className="flex-1 sm:flex-initial text-xs sm:text-sm" onClick={loadSuppliers}>
              <Icon name="refresh" size={16} />
              Refresh
            </Button>
            <Button className="flex-1 sm:flex-initial text-xs sm:text-sm" onClick={() => setShowAddModal(true)}>
              <Icon name="plus" size={16} />
              Add Supplier
            </Button>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <MetricCard title="Total Suppliers" value={String(suppliers.length)} meta="Registered vendors" icon="users" tone="blue" />
        <MetricCard title="Cumulative Spend" value={currency(totalSpendAll)} meta="Across all suppliers" icon="report" tone="emerald" />
        <MetricCard title="Average Spend / Supplier" value={currency(suppliers.length ? totalSpendAll / suppliers.length : 0)} meta="Average per vendor" icon="trend" />
      </div>
      <Card>
        <div className="flex gap-3 border-b border-slate-100 p-4">
          <div className="relative flex-1">
            <Icon className="absolute left-3 top-2.5 text-slate-400" name="search" size={16} />
            <Input
              className="pl-9"
              placeholder="Search by supplier name, phone, or GSTIN..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>
        {loading ? (
          <div className="p-16 text-center text-sm text-slate-500">Loading suppliers from database...</div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center py-20 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400">
              <Icon name="users" />
            </span>
            <h3 className="mt-3 font-bold text-slate-800">No suppliers found</h3>
            <p className="mt-1 text-sm text-slate-500">Add a supplier manually or scan an invoice to automatically register them.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Supplier Name</th>
                  <th className="px-5 py-3 font-semibold">Phone</th>
                  <th className="px-5 py-3 font-semibold">GSTIN</th>
                  <th className="px-5 py-3 font-semibold">Total Invoices</th>
                  <th className="px-5 py-3 font-semibold">Total Spend</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(s => (
                  <tr className="hover:bg-slate-50" key={s.id}>
                    <td className="px-5 py-4 font-semibold text-slate-800">{s.name}</td>
                    <td className="px-5 py-4 text-slate-600">{s.phone || "—"}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{s.gstin || "—"}</td>
                    <td className="px-5 py-4 font-medium text-slate-700">{s.totalInvoices} bills</td>
                    <td className="px-5 py-4 font-bold text-slate-900">{currency(Number(s.totalSpend || 0))}</td>
                    <td className="px-5 py-4">
                      <Badge tone="success">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 p-0 sm:p-4 backdrop-blur-sm" onMouseDown={() => setShowAddModal(false)}>
          <Card className="w-full max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden">
            <div onMouseDown={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Add New Supplier</h2>
                <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                  <Icon name="close" />
                </Button>
              </div>
              {err && <div className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
              <div className="space-y-4 p-5">
                <label className="block text-xs font-semibold text-slate-600">
                  Supplier Name *
                  <Input
                    className="mt-1.5"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Metro Food Distributors"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  Phone Number
                  <Input
                    className="mt-1.5"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  GSTIN
                  <Input
                    className="mt-1.5"
                    value={form.gstin}
                    onChange={e => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
                <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button disabled={submitting} onClick={handleCreateSupplier}>
                  <Icon name="check" size={16} />
                  {submitting ? "Saving..." : "Save Supplier"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function AIAssistant() {
  const [messages, setMessages] = useState([{ role: "ai", text: "Hello Amit. I can analyse your inventory, purchases and product movement. What would you like to know?" }]);
  const [value, setValue] = useState("");
  const ask = (text: string) => { if(!text.trim()) return; setMessages(m=>[...m,{role:"user",text},{role:"ai",text:"Based on the last 30 days, Aashirvaad Atta and Surf Excel need attention first. At current sales velocity, they may stock out within 6 and 4 days. Reordering 42 and 36 units respectively would provide roughly two weeks of cover."}]); setValue(""); };
  return (
    <>
      <PageHeader
        title="AI Assistant"
        description="Ask evidence-based questions about your inventory."
        actions={<Button className="text-xs sm:text-sm" onClick={() => setMessages([{ role: "ai", text: "Hello Amit. What inventory questions can I help with today?" }])}><Icon name="plus" size={15} />New conversation</Button>}
      />
      <Card className="grid min-h-[550px] sm:min-h-[650px] overflow-hidden lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50 p-3 sm:p-4 lg:border-b-0 lg:border-r">
          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Suggested questions</p>
          <div className="mt-2 flex lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0">
            {["What should I reorder this week?", "Which items are hurting margin?", "Show my dead stock risk", "Compare supplier prices"].map(q => (
              <button
                className="shrink-0 lg:w-full rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3 text-left text-xs font-medium leading-snug text-slate-600 hover:border-emerald-300 hover:text-emerald-700 whitespace-nowrap lg:whitespace-normal"
                key={q}
                onClick={() => ask(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </aside>
        <div className="flex min-w-0 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-8">
            {messages.map((m, i) => (
              <div className={`flex gap-2.5 sm:gap-3 ${m.role === "user" ? "justify-end" : ""}`} key={i}>
                {m.role === "ai" && (
                  <span className="grid size-7 sm:size-8 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white">
                    <Icon name="spark" size={15} />
                  </span>
                )}
                <div className={`max-w-2xl rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm leading-relaxed ${m.role === "user" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
                  {m.text}
                  {m.role === "ai" && i > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
                      <Badge tone="info">Sales: last 30 days</Badge>
                      <Badge tone="success">Inventory: live mock data</Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 p-3 sm:p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about stock, margins or suppliers…"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && ask(value)}
              />
              <Button onClick={() => ask(value)}>
                <Icon name="send" size={16} />
                <span className="hidden sm:inline">Ask</span>
              </Button>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              Responses use simulated prototype data and may not reflect real inventory.
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}

function Reports() {
  const [generated, setGenerated] = useState(true);
  return <><PageHeader title="Reports" description="Generate and export reports for business review." actions={<Button onClick={()=>setGenerated(!generated)}><Icon name="report" size={16} />Generate report</Button>} /><Card className="p-4"><div className="grid gap-3 sm:grid-cols-4"><label className="text-xs font-semibold text-slate-500">Report type<Select className="mt-1.5 w-full"><option>Inventory valuation</option><option>Gross margin</option><option>Stock movement</option><option>Purchases</option></Select></label><label className="text-xs font-semibold text-slate-500">From<Input className="mt-1.5" type="date" defaultValue="2025-03-01" /></label><label className="text-xs font-semibold text-slate-500">To<Input className="mt-1.5" type="date" defaultValue="2025-03-31" /></label><label className="text-xs font-semibold text-slate-500">Category<Select className="mt-1.5 w-full"><option>All categories</option><option>Grocery</option></Select></label></div></Card>{generated ? <><div className="mt-4 grid gap-3 sm:grid-cols-3"><MetricCard title="Opening value" value="₹11,82,400" meta="As of 01 Mar 2025" icon="box" /><MetricCard title="Closing value" value="₹12,48,620" meta="As of 31 Mar 2025" icon="trend" tone="blue" /><MetricCard title="Net movement" value="+₹66,220" meta="+5.6% during period" icon="refresh" tone="emerald" /></div><Card className="mt-4 p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Inventory valuation by category</h2><p className="text-xs text-slate-500">As of 31 March 2025</p></div><Button variant="secondary">Export CSV</Button></div><div className="mt-6 space-y-5">{[["Grocery",78, "₹5,24,420"],["Personal care",52,"₹3,48,280"],["Home care",36,"₹2,42,160"],["Snacks & beverages",20,"₹1,33,760"]].map(x=><div key={x[0]}><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-slate-700">{x[0]}</span><strong>{x[2]}</strong></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{width:`${x[1]}%`}} /></div></div>)}</div></Card></> : <Card className="mt-4 grid place-items-center py-24 text-center"><Icon name="report" className="text-slate-300" size={36} /><h2 className="mt-3 font-bold text-slate-800">Choose filters to generate a report</h2><p className="mt-1 text-sm text-slate-500">Your results will appear here.</p></Card>}</>;
}

function Settings({ user, onShopUpdated }: { user?: User | null; onShopUpdated?: (user: User) => void }) {
  const [activeTab, setActiveTab] = useState("Business profile");
  const [form, setForm] = useState({
    name: user?.shopName || "",
    gstin: "",
    phone: user?.phone || "",
    email: user?.email || "",
    address: "",
    currency: "INR",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState<{
    name: string;
    email: string;
    phone: string;
    password: string;
    role: "OWNER" | "MANAGER" | "SALESMAN" | "CASHIER";
  }>({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "SALESMAN",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [teamMessage, setTeamMessage] = useState("");

  useEffect(() => {
    if (user?.shopId) {
      setFetching(true);
      fetchCurrentShop()
        .then((shop) => {
          setForm({
            name: shop.name || "",
            gstin: shop.gstin || "",
            phone: shop.phone || user?.phone || "",
            email: shop.email || user?.email || "",
            address: shop.address || "",
            currency: shop.currency || "INR",
          });
        })
        .catch(() => {})
        .finally(() => setFetching(false));
    }
  }, [user?.shopId]);

  useEffect(() => {
    if (activeTab === "Team access" && user?.shopId) {
      setLoadingTeam(true);
      fetchTeamUsers()
        .then(setTeamUsers)
        .catch((err: unknown) => {
          if (err instanceof Error) {
            setTeamError(err.message);
          }
        })
        .finally(() => setLoadingTeam(false));
    }
  }, [activeTab, user?.shopId]);

  const updateField = (field: keyof typeof form, val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setMessage("");
    setError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Business name is required");
      return;
    }
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = user?.shopId
        ? await updateShop({
            name: form.name.trim(),
            gstin: form.gstin.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            address: form.address.trim(),
            currency: form.currency,
          })
        : await createShop({
            name: form.name.trim(),
            gstin: form.gstin.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            address: form.address.trim(),
            currency: form.currency,
          });

      if (onShopUpdated) {
        onShopUpdated(res.user);
      }
      setMessage("Shop details saved successfully.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to update shop profile");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeamUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name.trim() || !newUserForm.email.trim() || !newUserForm.phone.trim() || newUserForm.password.length < 6) {
      setTeamError("Fill all fields and use a password with at least 6 characters.");
      return;
    }
    setCreateLoading(true);
    setTeamError("");
    setTeamMessage("");
    try {
      const created = await createTeamUser({
        name: newUserForm.name.trim(),
        email: newUserForm.email.trim(),
        phone: newUserForm.phone.trim(),
        password: newUserForm.password,
        role: newUserForm.role,
      });
      setTeamUsers((prev) => [...prev, created]);
      setTeamMessage(`User ${created.fullName} created successfully with role ${created.role}.`);
      setNewUserForm({ name: "", email: "", phone: "", password: "", role: "SALESMAN" });
      setShowAddUser(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setTeamError(err.message);
      } else {
        setTeamError("Failed to create user.");
      }
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your business profile and inventory preferences."
      />
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit p-1.5 flex lg:flex-col overflow-x-auto gap-1">
          {["Business profile", "Inventory rules", "Tax & currency", "Notifications", "Team access"].map((tab) => (
            <button
              className={`shrink-0 rounded-lg px-3 py-2 text-left text-xs sm:text-sm font-medium transition whitespace-nowrap lg:w-full ${
                activeTab === tab ? "bg-emerald-50 text-emerald-700 font-bold" : "text-slate-600 hover:bg-slate-50"
              }`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </Card>

        {activeTab === "Business profile" && (
          <Card>
            <div className="border-b border-slate-100 p-5">
              <h2 className="font-bold text-slate-900">Business profile</h2>
              <p className="text-xs text-slate-500">
                Synced with your active shop record. Used across invoices, reports, and purchase records.
              </p>
            </div>
            {fetching ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading shop profile…</div>
            ) : (
              <form onSubmit={handleSave}>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Business name <span className="text-rose-500">*</span>
                    <Input
                      className="mt-1.5"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Shop / Business name"
                      required
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    GSTIN
                    <Input
                      className="mt-1.5"
                      value={form.gstin}
                      onChange={(e) => updateField("gstin", e.target.value)}
                      placeholder="23AABCU9603R1ZM"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Phone
                    <Input
                      className="mt-1.5"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Email
                    <Input
                      className="mt-1.5"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="shop@business.com"
                      type="email"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                    Address
                    <Input
                      className="mt-1.5"
                      value={form.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      placeholder="Store address, street, city, state"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Currency
                    <Select
                      className="mt-1.5 w-full"
                      value={form.currency}
                      onChange={(e) => updateField("currency", e.target.value)}
                    >
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                    </Select>
                  </label>
                </div>
                {error && (
                  <div className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                    <Icon className="shrink-0" name="warning" size={15} />
                    {error}
                  </div>
                )}
                {message && (
                  <div className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
                    <Icon className="shrink-0" name="check" size={15} />
                    {message}
                  </div>
                )}
                <div className="flex justify-end border-t border-slate-100 p-4">
                  <Button disabled={loading} type="submit">
                    {loading ? "Saving changes…" : "Save changes"}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}

        {activeTab === "Team access" && (
          <Card>
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-bold text-slate-900">Team access & roles</h2>
                <p className="text-xs text-slate-500">
                  Manage users who have access to this store.
                </p>
              </div>
              {user?.shopId && (
                <Button
                  onClick={() => {
                    setShowAddUser(!showAddUser);
                    setTeamError("");
                    setTeamMessage("");
                  }}
                  variant={showAddUser ? "secondary" : "primary"}
                >
                  <Icon name={showAddUser ? "close" : "plus"} size={16} />
                  {showAddUser ? "Cancel" : "Add team member"}
                </Button>
              )}
            </div>

            {!user?.shopId ? (
              <div className="p-8 text-center">
                <div className="mx-auto grid size-10 place-items-center rounded-full bg-amber-50 text-amber-700">
                  <Icon name="warning" size={20} />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">Shop setup required</p>
                <p className="mt-1 text-xs text-slate-500">
                  Please complete your shop setup in the Overview tab first before adding team members.
                </p>
              </div>
            ) : (
              <div className="p-5">
                {teamError && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                    <Icon className="shrink-0" name="warning" size={15} />
                    {teamError}
                  </div>
                )}
                {teamMessage && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
                    <Icon className="shrink-0" name="check" size={15} />
                    {teamMessage}
                  </div>
                )}

                {showAddUser && (
                  <form onSubmit={handleCreateTeamUser} className="mb-6 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                    <h3 className="text-sm font-bold text-slate-900">Create new user</h3>
                    <p className="mt-0.5 text-xs text-slate-500">Add credentials and assign a role for the new user.</p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-slate-700">
                        Full name <span className="text-rose-500">*</span>
                        <Input
                          className="mt-1.5"
                          placeholder="User full name"
                          value={newUserForm.name}
                          onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                          required
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Work email <span className="text-rose-500">*</span>
                        <Input
                          className="mt-1.5"
                          placeholder="user@business.com"
                          type="email"
                          value={newUserForm.email}
                          onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                          required
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Mobile phone <span className="text-rose-500">*</span>
                        <Input
                          className="mt-1.5"
                          placeholder="+91 98765 43210"
                          value={newUserForm.phone}
                          onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                          required
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Password <span className="text-rose-500">*</span>
                        <Input
                          className="mt-1.5"
                          placeholder="At least 6 characters"
                          type="password"
                          value={newUserForm.password}
                          onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                          required
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                        Store role <span className="text-rose-500">*</span>
                        <Select
                          className="mt-1.5 w-full"
                          value={newUserForm.role}
                          onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                        >
                          <option value="SALESMAN">SALESMAN - Scan bills, create sales</option>
                          <option value="CASHIER">CASHIER - Record billing and payments</option>
                          <option value="MANAGER">MANAGER - Inventory management and purchase approval</option>
                          <option value="OWNER">OWNER - Full shop control and settings</option>
                        </Select>
                      </label>
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setShowAddUser(false);
                          setTeamError("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button disabled={createLoading} type="submit">
                        {createLoading ? "Creating user…" : "Save user"}
                      </Button>
                    </div>
                  </form>
                )}

                {loadingTeam ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading team members…</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {teamUsers.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">No team members registered yet.</div>
                    ) : (
                      teamUsers.map((member) => (
                        <div key={member.id} className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center">
                          <div className="flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                              {member.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{member.fullName}</p>
                              <p className="text-xs text-slate-500">{member.email} • {member.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              tone={
                                member.role === "OWNER"
                                  ? "neutral"
                                  : member.role === "MANAGER"
                                  ? "info"
                                  : member.role === "SALESMAN"
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {member.role}
                            </Badge>
                            <Badge tone="success">Active</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {activeTab !== "Business profile" && activeTab !== "Team access" && (
          <Card className="p-8 text-center">
            <h2 className="text-base font-bold text-slate-900">{activeTab}</h2>
            <p className="mt-1 text-xs text-slate-500">Preferences for {activeTab.toLowerCase()} are managed under this workspace.</p>
          </Card>
        )}
      </div>
    </>
  );
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

  const updateField = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: value }));
  const changeMode = (next: "signin" | "signup") => {
    setMode(next);
    setError("");
  };

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError("Enter your email or phone number and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await signin({
        email: form.email.trim(),
        password: form.password,
      });
      onAuthenticated(response.user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Sign in failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || form.password.length < 6) {
      setError("Complete all fields and use a password with at least 6 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await signup({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      onAuthenticated(response.user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Account creation failed. Please check your details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[0.88fr_1.12fr]">
    <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_10%_88%,rgba(20,184,166,0.1),transparent_30%)]" />
      <div className="absolute inset-y-0 right-0 w-px bg-white/10" />
      <div className="absolute -right-10 top-28 select-none text-[18rem] font-black leading-none text-white/[0.025]">S</div>
      <div className="relative flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-emerald-500 text-lg font-extrabold text-slate-950">S</span>
        <span className="text-xl font-bold tracking-tight">StockMind</span>
      </div>
      <div className="relative my-auto max-w-lg">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Inventory intelligence</p>
        <h1 className="mt-5 text-4xl font-bold leading-[1.12] tracking-tight xl:text-5xl">Make every shelf<br />work smarter.</h1>
        <p className="mt-5 max-w-md text-base leading-7 text-slate-400">Clear decisions for healthier stock and stronger margins.</p>

        <svg aria-label="Animated smart inventory illustration" className="mt-7 w-full max-w-lg overflow-visible" role="img" viewBox="0 0 560 330">
          <defs>
            <linearGradient id="shelf-face" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#1e293b" />
              <stop offset="1" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="package-top" x1="0" x2="1">
              <stop offset="0" stopColor="#6ee7b7" />
              <stop offset="1" stopColor="#10b981" />
            </linearGradient>
            <filter id="soft-shadow" height="160%" width="160%" x="-30%" y="-30%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="10" />
              <feOffset dy="12" />
              <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .28 0" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <path d="M77 269 278 151l205 112-202 58L77 269Z" fill="#10b981" opacity=".06" />
          <path d="m83 269 197 48 197-56" fill="none" stroke="#34d399" strokeDasharray="5 9" strokeLinecap="round" opacity=".22" />

          <g className="auth-shelf" filter="url(#soft-shadow)">
            <path d="m147 96 196 46v142l-196-47V96Z" fill="url(#shelf-face)" stroke="#475569" strokeWidth="2" />
            <path d="m343 142 75-43v143l-75 42V142Z" fill="#111c2d" stroke="#475569" strokeWidth="2" />
            <path d="m147 96 75-42 196 45-75 43-196-46Z" fill="#334155" stroke="#64748b" strokeWidth="2" />
            <path d="m147 167 196 47 75-43M147 215l196 47 75-43" fill="none" stroke="#475569" strokeWidth="3" />
            <path d="M171 103v139M319 137v139" stroke="#64748b" strokeWidth="3" />
          </g>

          <g className="auth-box-one">
            <path d="m181 125 49 12v37l-49-12v-37Z" fill="#0f766e" />
            <path d="m230 137 20-12v37l-20 12v-37Z" fill="#115e59" />
            <path d="m181 125 20-12 49 12-20 12-49-12Z" fill="url(#package-top)" />
            <path d="m204 131 20 5" stroke="#d1fae5" strokeLinecap="round" strokeWidth="3" />
          </g>
          <g className="auth-box-two">
            <path d="m258 143 40 10v32l-40-10v-32Z" fill="#f59e0b" />
            <path d="m298 153 17-10v32l-17 10v-32Z" fill="#b45309" />
            <path d="m258 143 17-10 40 10-17 10-40-10Z" fill="#fcd34d" />
          </g>
          <g className="auth-box-three">
            <path d="m194 188 57 14v35l-57-14v-35Z" fill="#e2e8f0" />
            <path d="m251 202 19-11v35l-19 11v-35Z" fill="#94a3b8" />
            <path d="m194 188 19-11 57 14-19 11-57-14Z" fill="#f8fafc" />
            <path d="m208 198 27 7M208 206l18 4" stroke="#64748b" strokeLinecap="round" strokeWidth="2" />
          </g>

          <g className="auth-orbit">
            <path d="M104 190c20-67 79-116 151-123 81-8 159 38 190 110" fill="none" stroke="#34d399" strokeDasharray="3 9" strokeLinecap="round" strokeWidth="2" />
            <circle cx="104" cy="190" r="6" fill="#34d399" />
            <circle cx="445" cy="177" r="6" fill="#34d399" />
          </g>

          <g className="auth-scanner">
            <rect height="8" rx="4" fill="#6ee7b7" opacity=".18" width="268" x="134" y="154" />
            <path d="M143 157h250" stroke="#6ee7b7" strokeLinecap="round" strokeWidth="3" />
          </g>

          <g className="auth-float" filter="url(#soft-shadow)">
            <path d="m384 51 47 11v46l-47-11V51Z" fill="#059669" />
            <path d="m431 62 25-14v46l-25 14V62Z" fill="#047857" />
            <path d="m384 51 25-14 47 11-25 14-47-11Z" fill="#6ee7b7" />
            <path d="m398 67 8 10 15-19" fill="none" stroke="#ecfdf5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
          </g>
        </svg>
      </div>
      <div className="relative flex items-center gap-2 text-xs text-slate-500"><Icon name="check" size={14} className="text-emerald-500" /><span>Built for modern Indian retail</span></div>
    </section>

    <main className="flex min-h-screen items-center justify-center p-5 sm:p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <span className="grid size-9 place-items-center rounded-lg bg-emerald-600 text-sm font-extrabold text-white">S</span>
          <span className="text-xl font-bold tracking-tight text-slate-900">StockMind</span>
        </div>
        <div className="mb-7 flex rounded-xl bg-slate-200/70 p-1">
          <button className={`h-10 flex-1 rounded-lg text-sm font-semibold transition ${mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`} onClick={() => changeMode("signin")}>Sign in</button>
          <button className={`h-10 flex-1 rounded-lg text-sm font-semibold transition ${mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`} onClick={() => changeMode("signup")}>Create account</button>
        </div>

        {mode === "signin" ? <form onSubmit={signIn}>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to manage your shop inventory.</p>
          <div className="mt-7 space-y-4">
            <label className="block text-xs font-semibold text-slate-700">Email or phone number<Input className="mt-1.5 h-11" value={form.email} onChange={event => updateField("email", event.target.value)} placeholder="you@business.com or phone" /></label>
            <label className="block text-xs font-semibold text-slate-700"><span className="flex items-center justify-between"><span>Password</span><button className="font-semibold text-emerald-700 hover:text-emerald-800" type="button" onClick={() => setShowReset(true)}>Forgot password?</button></span><Input className="mt-1.5 h-11" value={form.password} onChange={event => updateField("password", event.target.value)} placeholder="Enter your password" type="password" /></label>
          </div>
          {error && <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700"><Icon className="shrink-0" name="warning" size={15} />{error}</div>}
          <label className="mt-4 flex items-center gap-2 text-xs text-slate-600"><input defaultChecked className="size-4 accent-emerald-600" type="checkbox" />Keep me signed in on this device</label>
          <Button className="mt-6 h-11 w-full" disabled={loading} type="submit">{loading ? "Signing you in…" : "Sign in to StockMind"}{!loading && <Icon name="arrow" size={16} />}</Button>
          <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-slate-200" /><span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">New to StockMind?</span><span className="h-px flex-1 bg-slate-200" /></div>
          <Button className="h-11 w-full" variant="secondary" type="button" onClick={() => changeMode("signup")}>Create an account</Button>
        </form> : <form onSubmit={handleSignup}>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
            <p className="mt-2 text-sm text-slate-500">Sign up with your personal and contact details. You can configure your shop later.</p>
          </div>
          <div className="mt-6 space-y-4">
            <label className="block text-xs font-semibold text-slate-700">Full name<Input className="mt-1.5 h-11" value={form.name} onChange={event => updateField("name", event.target.value)} placeholder="Your full name" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-700">Mobile number<Input className="mt-1.5 h-11" value={form.phone} onChange={event => updateField("phone", event.target.value)} placeholder="+91 98765 43210" /></label>
              <label className="block text-xs font-semibold text-slate-700">Work email<Input className="mt-1.5 h-11" value={form.email} onChange={event => updateField("email", event.target.value)} placeholder="you@business.com" type="email" /></label>
            </div>
            <label className="block text-xs font-semibold text-slate-700">Create password<Input className="mt-1.5 h-11" value={form.password} onChange={event => updateField("password", event.target.value)} placeholder="At least 6 characters" type="password" /><span className="mt-1.5 block font-normal text-slate-400">Use 6 or more characters.</span></label>
          </div>
          {error && <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700"><Icon className="shrink-0" name="warning" size={15} />{error}</div>}
          <Button className="mt-6 h-11 w-full" disabled={loading} type="submit">{loading ? "Creating your account…" : "Create account"}{!loading && <Icon name="arrow" size={16} />}</Button>
          <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-slate-200" /><span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Already registered?</span><span className="h-px flex-1 bg-slate-200" /></div>
          <Button className="h-11 w-full" variant="secondary" type="button" onClick={() => changeMode("signin")}>Sign in to existing account</Button>
        </form>}
      </div>
    </main>

    {showReset && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={() => setShowReset(false)}><Card className="w-full max-w-md shadow-2xl"><div onMouseDown={event => event.stopPropagation()}><div className="flex items-start justify-between p-5"><span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Icon name={resetSent ? "check" : "settings"} /></span><Button variant="ghost" onClick={() => setShowReset(false)}><Icon name="close" /></Button></div><div className="px-5 pb-5"><h2 className="text-xl font-bold text-slate-900">{resetSent ? "Check your inbox" : "Reset your password"}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{resetSent ? `We simulated sending a reset link to ${form.email}.` : "Enter your account email and we’ll send you a secure reset link."}</p>{!resetSent && <label className="mt-5 block text-xs font-semibold text-slate-700">Email address<Input className="mt-1.5 h-11" value={form.email} onChange={event => updateField("email", event.target.value)} type="email" /></label>}<Button className="mt-5 h-11 w-full" onClick={() => resetSent ? setShowReset(false) : setResetSent(true)}>{resetSent ? "Return to sign in" : "Send reset link"}</Button></div></div></Card></div>}
  </div>;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const [authenticated, setAuthenticated] = useState(() => !!getToken());
  const [active, setActive] = useState("Overview");
  const [sidebar, setSidebar] = useState(() => localStorage.getItem("sidebar_open") === "true");

  const [showScanner, setShowScanner] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<ProductDetail | null>(null);
  const [qrModalProduct, setQrModalProduct] = useState<ProductDetail | null>(null);

  const [printQueue, setPrintQueue] = useState<PrintQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem("barcode_print_queue");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    localStorage.setItem("sidebar_open", String(sidebar));
  }, [sidebar]);

  useEffect(() => {
    try {
      localStorage.setItem("barcode_print_queue", JSON.stringify(printQueue));
    } catch {
    }
  }, [printQueue]);

  useEffect(() => {
    if (getToken()) {
      fetchCurrentUser()
        .then(user => {
          setCurrentUser(user);
          setAuthenticated(true);
        })
        .catch(() => {
          logout();
          setCurrentUser(null);
          setAuthenticated(false);
        });
    }
  }, []);

  const totalPrintQueueCount = useMemo(() => printQueue.reduce((acc, it) => acc + (it.quantity || 1), 0), [printQueue]);

  const addToPrintQueue = (p: ProductDetail | any, qty: number = 1) => {
    const sku = (p.sku || p.id || "").trim();
    if (!sku) return;
    setPrintQueue(prev => {
      const existingIdx = prev.findIndex(item => item.sku === sku);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + Math.max(1, qty),
        };
        return next;
      }
      return [...prev, { sku, name: p.name || sku, quantity: Math.max(1, qty) }];
    });
  };

  const updatePrintQueueQuantity = (sku: string, quantity: number) => {
    setPrintQueue(prev =>
      prev.map(item => (item.sku === sku ? { ...item, quantity: Math.max(1, quantity) } : item))
    );
  };

  const removePrintQueueItem = (sku: string) => {
    setPrintQueue(prev => prev.filter(item => item.sku !== sku));
  };

  const reorderPrintQueue = (fromIndex: number, toIndex: number) => {
    setPrintQueue(prev => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const clearPrintQueue = () => {
    setPrintQueue([]);
  };

  const openQrModal = (p: any) => {
    const detail: ProductDetail = {
      id: p.id || p.sku,
      name: p.name,
      sku: p.sku,
      category: p.category,
      sellingPrice: Number(p.price || p.sellingPrice) || 0,
      discountPrice: p.discountPrice ? Number(p.discountPrice) : undefined,
      mrp: p.mrp ? Number(p.mrp) : undefined,
      buyingPrice: p.cost ? Number(p.cost) : Number(p.buyingPrice) || 0,
      lastPurchaseCost: p.cost ? Number(p.cost) : Number(p.lastPurchaseCost) || 0,
      stock: Number(p.stock) || 0,
      qrToken: p.qrToken || p.sku,
      hsnSac: p.hsnSac,
    };
    setQrModalProduct(detail);
  };

  const render = () => {
    if (active === "Overview") return <Overview onNavigate={setActive} user={currentUser} onShopCreated={(u) => setCurrentUser(u)} onShowQr={openQrModal} />;
    if (active === "Products" || active === "Inventory") return <ProductsScreen onShowQr={openQrModal} onScanQr={() => setShowScanner(true)} printQueueCount={totalPrintQueueCount} onOpenPrintModal={() => setShowPrintModal(true)} onAddToPrintQueue={addToPrintQueue} />;
    if (active === "Invoice Scanner") return <InvoiceScanner />;
    if (active === "Invoices" || active === "Purchases") return <InvoicesScreen onNavigate={setActive} />;
    if (active === "Suppliers") return <SuppliersScreen />;
    if (active === "AI Assistant") return <AIAssistant />;
    if (active === "Reports") return <Reports />;
    if (active === "Settings") return <Settings user={currentUser} onShopUpdated={(u) => setCurrentUser(u)} />;
    return <Overview onNavigate={setActive} user={currentUser} onShopCreated={(u) => setCurrentUser(u)} onShowQr={openQrModal} />;
  };

  if (!authenticated) return <AuthScreen onAuthenticated={(user) => { setCurrentUser(user); setAuthenticated(true); }} />;

  return <div className="min-h-screen bg-slate-50 text-slate-700 w-full max-w-full overflow-x-hidden">
    <Sidebar active={active} onNavigate={setActive} open={sidebar} onClose={() => setSidebar(false)} onLogout={() => { logout(); setCurrentUser(null); setAuthenticated(false); setSidebar(false); }} user={currentUser} />
    {sidebar && <button aria-label="Close sidebar" className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={() => setSidebar(false)} />}
    <div className={`transition-[padding] duration-200 ${sidebar ? "lg:pl-64" : "pl-0"} min-w-0 max-w-full overflow-x-hidden`}>
      <Header onMenu={() => setSidebar(prev => !prev)} onNavigate={setActive} sidebarOpen={sidebar} onScanQr={() => setShowScanner(true)} printQueueCount={totalPrintQueueCount} onOpenPrintModal={() => setShowPrintModal(true)} />
      <main className="mx-auto max-w-[1600px] p-3 sm:p-6 min-w-0 overflow-x-hidden">{render()}</main>
    </div>

    {showScanner && (
      <QrScannerModal
        onClose={() => setShowScanner(false)}
        onProductFound={(prod) => {
          setShowScanner(false);
          setScannedProduct(prod);
        }}
      />
    )}

    {scannedProduct && (
      <ProductPriceModal
        product={scannedProduct}
        onClose={() => setScannedProduct(null)}
        onShowQr={(prod) => {
          setScannedProduct(null);
          setQrModalProduct(prod);
        }}
      />
    )}

    {qrModalProduct && (
      <QrCodeModal
        product={qrModalProduct}
        onClose={() => setQrModalProduct(null)}
        onAddToPrintQueue={addToPrintQueue}
      />
    )}

    {showPrintModal && (
      <BarcodePrintModal
        queue={printQueue}
        onClose={() => setShowPrintModal(false)}
        onUpdateQuantity={updatePrintQueueQuantity}
        onRemoveItem={removePrintQueueItem}
        onReorder={reorderPrintQueue}
        onClearQueue={clearPrintQueue}
      />
    )}
  </div>;
}
