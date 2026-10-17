import { useEffect, useMemo, useRef, useState } from "react";
import { User, getToken, getStoredUser, signup, signin, fetchCurrentUser, logout } from "./services/auth";

type IconName =
  | "grid" | "box" | "tag" | "scan" | "cart" | "sale" | "users" | "spark"
  | "archive" | "refresh" | "chat" | "report" | "settings" | "search"
  | "bell" | "chevron" | "arrow" | "trend" | "warning" | "check" | "plus"
  | "upload" | "filter" | "more" | "close" | "edit" | "file" | "send" | "menu";

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
  return <section className={`rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${className}`}>{children}</section>;
}

function PageHeader({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>{actions && <div className="flex items-center gap-2">{actions}</div>}</div>;
}

const nav = [
  ["Overview", "grid"], ["Inventory", "box"], ["Products", "tag"], ["Invoice Scanner", "scan"],
  ["Purchases", "cart"], ["Sales", "sale"], ["Suppliers", "users"], ["Purchase Intelligence", "spark"],
  ["Dead Stock", "archive"], ["Replenishment Planner", "refresh"], ["AI Assistant", "chat"],
  ["Reports", "report"], ["Settings", "settings"],
] as [string, IconName][];

const products = [
  { name: "Aashirvaad Atta 5 kg", sku: "GRO-1024", category: "Grocery", stock: 18, cost: 238, price: 285, margin: 16.5, status: "Low stock" },
  { name: "Fortune Sunflower Oil 1L", sku: "GRO-1048", category: "Grocery", stock: 42, cost: 112, price: 139, margin: 19.4, status: "In stock" },
  { name: "Tata Salt 1 kg", sku: "GRO-1012", category: "Grocery", stock: 86, cost: 24, price: 30, margin: 20, status: "In stock" },
  { name: "Surf Excel Easy Wash 1 kg", sku: "HOM-2041", category: "Home care", stock: 9, cost: 124, price: 158, margin: 21.5, status: "Low stock" },
  { name: "Britannia Good Day 600 g", sku: "SNK-3021", category: "Snacks", stock: 0, cost: 92, price: 120, margin: 23.3, status: "Out of stock" },
  { name: "Dove Bathing Bar 3×125 g", sku: "PER-4018", category: "Personal care", stock: 34, cost: 168, price: 205, margin: 18, status: "In stock" },
  { name: "Maggi 2-Minute Noodles 560 g", sku: "SNK-3092", category: "Snacks", stock: 67, cost: 91, price: 112, margin: 18.8, status: "In stock" },
];

const currency = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

function Sidebar({ active, onNavigate, open, onClose, onLogout, user }: { active: string; onNavigate: (n: string) => void; open: boolean; onClose: () => void; onLogout: () => void; user?: User | null }) {
  return <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-950 text-slate-300 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
    <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
      <button className="flex items-center gap-2.5" onClick={() => onNavigate("Overview")}>
        <span className="grid size-8 place-items-center rounded-lg bg-emerald-500 text-sm font-extrabold text-slate-950">S</span>
        <span className="text-lg font-bold tracking-tight text-white">StockMind</span>
      </button>
      <button className="text-slate-400 lg:hidden" onClick={onClose}><Icon name="close" /></button>
    </div>
    <div className="mx-3 mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-md bg-amber-100 text-xs font-bold text-amber-800">VM</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">Verma Mini Mart</p><p className="text-xs text-slate-400">Indore, Madhya Pradesh</p></div></div>
    </div>
    <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
      {nav.map(([label, icon]) => <button key={label} onClick={() => { onNavigate(label); onClose(); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${active === label ? "bg-emerald-500/15 text-emerald-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><Icon name={icon} size={17} />{label}{label === "Invoice Scanner" && <span className="ml-auto rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">AI</span>}</button>)}
    </nav>
    <div className="border-t border-white/10 p-3"><button className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-white/5" onClick={onLogout}><span className="grid size-8 place-items-center rounded-full bg-slate-700 text-xs font-bold text-white">{user?.fullName ? user.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "US"}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{user?.fullName || "User"}</span><span className="block text-xs text-slate-500">Sign out</span></span><Icon name="arrow" /></button></div>
  </aside>;
}

function Header({ onMenu, onNavigate }: { onMenu: () => void; onNavigate: (n: string) => void }) {
  return <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
    <Button className="mr-2 lg:hidden" variant="ghost" onClick={onMenu}><Icon name="menu" /></Button>
    <div className="relative hidden w-full max-w-md md:block"><Icon className="absolute left-3 top-2.5 text-slate-400" name="search" size={17} /><Input className="bg-slate-50 pl-9" placeholder="Search products, suppliers, invoices…" /></div>
    <div className="ml-auto flex items-center gap-2">
      <Button variant="secondary" onClick={() => onNavigate("Invoice Scanner")}><Icon name="scan" size={16} /><span className="hidden sm:inline">Scan invoice</span></Button>
      <button className="relative grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><Icon name="bell" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-rose-500 ring-2 ring-white" /></button>
    </div>
  </header>;
}

function MetricCard({ title, value, meta, icon, tone = "emerald" }: { title: string; value: string; meta: string; icon: IconName; tone?: "emerald" | "amber" | "blue" | "violet" }) {
  const tones = { emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", blue: "bg-blue-50 text-blue-700", violet: "bg-violet-50 text-violet-700" };
  return <Card className="p-4"><div className="flex items-start justify-between"><p className="text-sm font-medium text-slate-500">{title}</p><span className={`grid size-8 place-items-center rounded-lg ${tones[tone]}`}><Icon name={icon} size={16} /></span></div><p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{meta}</p></Card>;
}

function Overview({ onNavigate }: { onNavigate: (n: string) => void }) {
  const chart = [42, 46, 44, 51, 48, 56, 58, 61, 59, 66, 68, 72];
  return <>
    <PageHeader title="Good morning, Amit" description="Here’s what needs your attention across Verma Mini Mart." actions={<><Select defaultValue="30"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></Select><Button><Icon name="plus" size={16} />Add product</Button></>} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard title="Inventory value" value="₹12,48,620" meta="↑ 3.2% from last month" icon="box" />
      <MetricCard title="Active products" value="1,248" meta="32 added this month" icon="tag" tone="blue" />
      <MetricCard title="Low stock items" value="18" meta="6 need attention today" icon="warning" tone="amber" />
      <MetricCard title="Estimated margin" value="22.4%" meta="↑ 1.8% from last month" icon="trend" tone="violet" />
    </div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-bold text-slate-900">Stock value trend</h2><p className="mt-0.5 text-xs text-slate-500">Inventory value over the last 12 weeks</p></div><div className="text-right"><p className="text-lg font-bold text-slate-900">₹12.49L</p><p className="text-xs font-medium text-emerald-600">+8.6% overall</p></div></div>
        <div className="p-5">
          <div className="flex h-52 items-end gap-2 border-b border-slate-100">{chart.map((h, i) => <div className="group relative flex h-full flex-1 items-end" key={i}><div className="w-full rounded-t bg-emerald-100 transition hover:bg-emerald-400" style={{ height: `${h}%` }} /></div>)}</div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-400"><span>06 Jan</span><span>03 Feb</span><span>03 Mar</span><span>24 Mar</span></div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-bold text-slate-900">Needs attention</h2><p className="mt-0.5 text-xs text-slate-500">Prioritized by business impact</p></div><Badge tone="warning">6 actions</Badge></div>
        <div className="divide-y divide-slate-100">
          {[["warning", "6 items may stock out this week", "Potential lost sales of ₹18,400", "Replenishment Planner", "amber"], ["trend", "Supplier cost increased on 12 items", "Average increase of 8.2%", "Purchase Intelligence", "rose"], ["archive", "₹42,680 tied in dead stock", "14 items unsold for 90+ days", "Dead Stock", "blue"]].map(([icon, title, sub, target, tone]) => <button className="flex w-full gap-3 p-4 text-left hover:bg-slate-50" key={title} onClick={() => onNavigate(target)}><span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${tone === "amber" ? "bg-amber-50 text-amber-700" : tone === "rose" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}><Icon name={icon as IconName} size={16} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{title}</span><span className="mt-0.5 block text-xs text-slate-500">{sub}</span></span><Icon className="mt-2 text-slate-400" name="arrow" size={15} /></button>)}
        </div>
      </Card>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2"><div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="font-bold text-slate-900">Top products by value</h2><Button variant="ghost" onClick={() => onNavigate("Inventory")}>View inventory <Icon name="arrow" size={15} /></Button></div><ProductTable compact onProduct={() => onNavigate("Inventory")} /></Card>
      <Card className="p-5"><h2 className="font-bold text-slate-900">Purchase spend</h2><p className="text-xs text-slate-500">March 2025</p><div className="mt-5 flex items-center gap-5"><div className="grid size-28 place-items-center rounded-full bg-[conic-gradient(#059669_0_42%,#0f766e_42%_70%,#f59e0b_70%_87%,#e2e8f0_87%)]"><div className="grid size-16 place-items-center rounded-full bg-white text-center"><span className="text-xs text-slate-500">Total</span><strong className="-mt-3 text-sm text-slate-900">₹3.2L</strong></div></div><div className="space-y-2 text-xs">{[["Grocery","42%","bg-emerald-600"],["Home care","28%","bg-teal-700"],["Personal care","17%","bg-amber-500"],["Other","13%","bg-slate-200"]].map(x=><div className="flex items-center gap-2" key={x[0]}><span className={`size-2 rounded-full ${x[2]}`} /><span className="w-20 text-slate-500">{x[0]}</span><strong>{x[1]}</strong></div>)}</div></div></Card>
    </div>
  </>;
}

function ProductTable({ compact = false, onProduct }: { compact?: boolean; onProduct: (p: typeof products[0]) => void }) {
  const rows = compact ? products.slice(0, 4) : products;
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-500"><th className="px-5 py-3 font-semibold">Product</th><th className="px-4 py-3 font-semibold">Stock</th><th className="px-4 py-3 font-semibold">Cost</th><th className="px-4 py-3 font-semibold">Selling price</th><th className="px-4 py-3 font-semibold">Margin</th><th className="px-4 py-3 font-semibold">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(p => <tr className="cursor-pointer text-sm hover:bg-slate-50" key={p.sku} onClick={() => onProduct(p)}><td className="px-5 py-3"><div className="font-semibold text-slate-800">{p.name}</div><div className="text-xs text-slate-400">{p.sku} · {p.category}</div></td><td className="px-4 py-3 font-medium">{p.stock}</td><td className="px-4 py-3">{currency(p.cost)}</td><td className="px-4 py-3">{currency(p.price)}</td><td className="px-4 py-3 font-medium text-emerald-700">{p.margin}%</td><td className="px-4 py-3"><Badge tone={p.status === "In stock" ? "success" : p.status === "Low stock" ? "warning" : "danger"}>{p.status}</Badge></td></tr>)}</tbody></table></div>;
}

function ProductDialog({ product, onClose }: { product: typeof products[0]; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={onClose}><Card className="w-full max-w-2xl shadow-2xl" ><div onMouseDown={e => e.stopPropagation()}><div className="flex items-start justify-between border-b border-slate-100 p-5"><div><Badge tone={product.status === "In stock" ? "success" : "warning"}>{product.status}</Badge><h2 className="mt-2 text-xl font-bold text-slate-900">{product.name}</h2><p className="text-sm text-slate-500">{product.sku} · Barcode 8901725 100248</p></div><Button variant="ghost" onClick={onClose}><Icon name="close" /></Button></div><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Product name<Input className="mt-1.5" defaultValue={product.name} /></label><label className="text-xs font-semibold text-slate-600">Category<Select className="mt-1.5 w-full" defaultValue={product.category}><option>{product.category}</option><option>Grocery</option><option>Home care</option></Select></label><label className="text-xs font-semibold text-slate-600">Cost price<Input className="mt-1.5" defaultValue={product.cost} type="number" /></label><label className="text-xs font-semibold text-slate-600">Selling price<Input className="mt-1.5" defaultValue={product.price} type="number" /></label><label className="text-xs font-semibold text-slate-600">Current stock<Input className="mt-1.5" defaultValue={product.stock} type="number" /></label><label className="text-xs font-semibold text-slate-600">Low-stock threshold<Input className="mt-1.5" defaultValue="15" type="number" /></label></div><div className="flex justify-end gap-2 border-t border-slate-100 p-4"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={onClose}><Icon name="check" size={16} />Save changes</Button></div></div></Card></div>;
}

function Inventory({ productsMode = false }: { productsMode?: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All status");
  const [selected, setSelected] = useState<typeof products[0] | null>(null);
  const [importing, setImporting] = useState(false);
  const filtered = useMemo(() => products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) && (status === "All status" || p.status === status)), [query, status]);
  return <>
    <PageHeader title={productsMode ? "Products" : "Inventory"} description={productsMode ? "Manage your product catalogue, pricing and barcodes." : "Track stock levels, valuation and product availability."} actions={<><Button variant="secondary" onClick={() => setImporting(true)}><Icon name="upload" size={16} />Import CSV / Excel</Button><Button onClick={() => setSelected({ name: "New product", sku: "AUTO", category: "Grocery", stock: 0, cost: 0, price: 0, margin: 0, status: "In stock" })}><Icon name="plus" size={16} />Add product</Button></>} />
    <Card><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row"><div className="relative flex-1"><Icon className="absolute left-3 top-2.5 text-slate-400" name="search" size={17} /><Input className="pl-9" placeholder="Search by product, SKU or barcode" value={query} onChange={e => setQuery(e.target.value)} /></div><Select value={status} onChange={e => setStatus(e.target.value)}><option>All status</option><option>In stock</option><option>Low stock</option><option>Out of stock</option></Select><Button variant="secondary"><Icon name="filter" size={16} />More filters</Button></div>
      {filtered.length ? <ProductTable onProduct={setSelected} /> : <div className="grid place-items-center py-20 text-center"><span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400"><Icon name="search" /></span><h3 className="mt-3 font-bold text-slate-800">No products found</h3><p className="mt-1 text-sm text-slate-500">Try changing your search or filters.</p></div>}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><span>Showing {filtered.length} of 1,248 products</span><div className="flex gap-1"><Button variant="secondary" disabled>Previous</Button><Button variant="secondary">Next</Button></div></div>
    </Card>
    {selected && <ProductDialog product={selected} onClose={() => setSelected(null)} />}
    {importing && <CsvImport onClose={() => setImporting(false)} />}
  </>;
}

function CsvImport({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><Card className="w-full max-w-3xl shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="text-lg font-bold text-slate-900">Import products</h2><p className="text-sm text-slate-500">Upload and map a CSV or Excel file</p></div><Button variant="ghost" onClick={onClose}><Icon name="close" /></Button></div>{step === 1 ? <div className="p-6"><button className="grid w-full place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-14 hover:border-emerald-400 hover:bg-emerald-50/30" onClick={() => setStep(2)}><span className="grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="upload" /></span><strong className="mt-3 text-sm text-slate-800">Choose a file or drag it here</strong><span className="mt-1 text-xs text-slate-500">CSV, XLS or XLSX up to 10 MB</span></button></div> : <div className="p-6"><div className="mb-4 flex items-center gap-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><Icon name="check" /><strong>products_march.xlsx</strong><span className="text-emerald-600">· 126 rows found</span></div><h3 className="font-bold text-slate-800">Map file columns</h3><div className="mt-3 grid grid-cols-2 gap-3">{[["Product Name","Name"],["Item Code","SKU"],["Purchase Rate","Cost price"],["MRP","Selling price"],["Closing Stock","Opening quantity"],["GST %","Tax rate"]].map(x => <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3" key={x[0]}><span className="flex-1 text-xs font-medium text-slate-500">{x[0]}</span><Icon name="arrow" size={14} /><Select defaultValue={x[1]}>{[x[1],"Ignore"].map(v=><option key={v}>{v}</option>)}</Select></div>)}</div></div>}<div className="flex justify-end gap-2 border-t border-slate-100 p-4"><Button variant="secondary" onClick={onClose}>Cancel</Button>{step === 2 && <Button onClick={onClose}>Import 126 products</Button>}</div></Card></div>;
}

type InvoiceItem = { name: string; qty: number; cost: number; match: string; confidence: number; included: boolean };
const initialInvoice: InvoiceItem[] = [
  { name: "AASHIRVAAD ATTA 5KG", qty: 12, cost: 236, match: "Aashirvaad Atta 5 kg", confidence: 98, included: true },
  { name: "FORTUNE SUN OIL 1L", qty: 24, cost: 114.5, match: "Fortune Sunflower Oil 1L", confidence: 92, included: true },
  { name: "GOOD DAY CASHEW 600G", qty: 18, cost: 89, match: "Britannia Good Day 600 g", confidence: 71, included: true },
  { name: "CLEANMAX FLOOR 1L", qty: 6, cost: 128, match: "Create as new product", confidence: 54, included: true },
];

function InvoiceScanner() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState(initialInvoice);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const extract = () => { setLoading(true); setTimeout(() => { setLoading(false); setStep(2); }, 900); };
  const total = items.filter(x => x.included).reduce((sum, x) => sum + x.qty * x.cost, 0);
  const update = (index: number, key: keyof InvoiceItem, value: string | number | boolean) => setItems(items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  if (success) return <><PageHeader title="Invoice Scanner" description="Turn supplier invoices into accurate stock updates." /><Card className="mx-auto max-w-xl p-10 text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="check" size={30} /></span><h2 className="mt-5 text-2xl font-bold text-slate-900">Import completed</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">60 units across 4 products were added to inventory. Purchase invoice SRS-1824 has been saved locally in this prototype.</p><div className="mt-6 rounded-lg bg-slate-50 p-4 text-left text-sm"><div className="flex justify-between py-1"><span className="text-slate-500">Stock value added</span><strong>{currency(total)}</strong></div><div className="flex justify-between py-1"><span className="text-slate-500">Supplier</span><strong>Shree Ram Suppliers</strong></div></div><Button className="mt-6" onClick={() => { setSuccess(false); setStep(1); }}>Scan another invoice</Button></Card></>;
  return <>
    <PageHeader title="Invoice Scanner" description="Turn supplier invoices into accurate stock updates." />
    <div className="mb-5 flex items-center"><Step number={1} label="Scan" active={step >= 1} done={step > 1} /><Line active={step > 1} /><Step number={2} label="Review" active={step >= 2} done={step > 2} /><Line active={step > 2} /><Step number={3} label="Import" active={step >= 3} done={false} /></div>
    {step === 1 && <Card className="p-5"><div className="grid min-h-[520px] gap-5 lg:grid-cols-2"><button onClick={() => fileRef.current?.click()} className="grid place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition hover:border-emerald-400 hover:bg-emerald-50/30"><input ref={fileRef} className="hidden" type="file" accept=".pdf,image/*" onChange={extract} /><div><span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="scan" size={26} /></span><h2 className="mt-4 font-bold text-slate-900">Upload a supplier invoice</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">Drop a PDF, JPG or PNG here, or click to browse. We’ll extract supplier and line-item details.</p><Button className="mt-5" type="button" onClick={e => { e.stopPropagation(); extract(); }}><Icon name="upload" size={16} />{loading ? "Extracting invoice…" : "Choose invoice"}</Button><p className="mt-3 text-xs text-slate-400">Try the prototype with a sample invoice</p></div></button><div className="rounded-xl border border-slate-200 p-6"><h2 className="font-bold text-slate-900">How it works</h2><div className="mt-6 space-y-6">{[["1","AI extracts every line item","Supplier, invoice number, taxes, quantities and prices."],["2","You review and match products","Confirm suggestions and resolve low-confidence fields."],["3","Stock updates instantly","Import validated items into your inventory records."]].map(x=><div className="flex gap-4" key={x[0]}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">{x[0]}</span><div><h3 className="text-sm font-bold text-slate-800">{x[1]}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{x[2]}</p></div></div>)}</div><div className="mt-8 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800"><strong>Prototype note</strong><p className="mt-1 text-xs leading-5 text-blue-700">No document is uploaded to a server. Extraction is simulated using realistic sample data.</p></div></div></div></Card>}
    {step === 2 && <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]"><Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-4"><div><h2 className="font-bold text-slate-900">SRS_Invoice_1824.pdf</h2><p className="text-xs text-slate-500">1 page · 482 KB</p></div><Badge tone="success">Extracted</Badge></div><div className="m-4 min-h-[580px] rounded-lg bg-slate-100 p-5"><div className="mx-auto max-w-md bg-white p-7 shadow-sm"><div className="border-b-2 border-slate-800 pb-4 text-center"><h3 className="text-lg font-extrabold">SHREE RAM SUPPLIERS</h3><p className="text-[10px] text-slate-500">Dewas Naka, Indore · GSTIN 23AADFS2812H1Z8</p></div><div className="my-4 flex justify-between text-[10px]"><div><strong>Invoice: SRS-1824</strong><p>Date: 22 Mar 2025</p></div><div className="text-right"><strong>Verma Mini Mart</strong><p>Vijay Nagar, Indore</p></div></div><table className="w-full text-[9px]"><thead className="bg-slate-100"><tr><th className="p-2 text-left">Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{items.map(x=><tr className="border-b" key={x.name}><td className="p-2">{x.name}</td><td>{x.qty}</td><td>{x.cost}</td><td>{(x.qty*x.cost).toFixed(0)}</td></tr>)}</tbody></table><div className="mt-6 text-right text-xs font-bold">Invoice Total: ₹10,238</div></div></div></Card><InvoiceReview items={items} update={update} onNext={() => setStep(3)} /> </div>}
    {step === 3 && <ImportConfirm items={items} total={total} onBack={() => setStep(2)} onImport={() => { setLoading(true); setTimeout(() => { setLoading(false); setSuccess(true); }, 900); }} loading={loading} />}
  </>;
}

function Step({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) { return <div className="flex items-center gap-2"><span className={`grid size-8 place-items-center rounded-full text-xs font-bold ${active ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>{done ? <Icon name="check" size={15} /> : number}</span><span className={`text-sm font-semibold ${active ? "text-slate-800" : "text-slate-400"}`}>{label}</span></div>; }
function Line({ active }: { active: boolean }) { return <div className={`mx-3 h-px max-w-24 flex-1 ${active ? "bg-emerald-600" : "bg-slate-200"}`} />; }

function InvoiceReview({ items, update, onNext }: { items: InvoiceItem[]; update: (i: number, key: keyof InvoiceItem, value: string | number | boolean) => void; onNext: () => void }) {
  return <Card><div className="flex items-center justify-between border-b border-slate-100 p-4"><div><h2 className="font-bold text-slate-900">Review extracted items</h2><p className="text-xs text-slate-500">{items.length} line items · 1 needs review</p></div><Badge tone="warning"><Icon name="warning" size={12} />&nbsp; Check highlighted fields</Badge></div><div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-4 sm:grid-cols-3"><label className="text-xs font-semibold text-slate-500">Supplier<Input className="mt-1.5" defaultValue="Shree Ram Suppliers" /></label><label className="text-xs font-semibold text-slate-500">Invoice number<Input className="mt-1.5" defaultValue="SRS-1824" /></label><label className="text-xs font-semibold text-slate-500">Invoice date<Input className="mt-1.5" defaultValue="2025-03-22" type="date" /></label></div><div className="divide-y divide-slate-100">{items.map((item, i)=><div className={`p-4 ${!item.included ? "opacity-50" : ""}`} key={item.name}><div className="flex items-start gap-3"><input checked={item.included} className="mt-1 size-4 accent-emerald-600" type="checkbox" onChange={e=>update(i,"included",e.target.checked)} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-bold text-slate-800">{item.name}</h3><Badge tone={item.confidence > 80 ? "success" : "warning"}>{item.confidence}%</Badge></div><div className="mt-3 grid grid-cols-[1fr_72px_90px] gap-2"><Select className={item.confidence < 60 ? "border-amber-400 bg-amber-50" : ""} value={item.match} onChange={e=>update(i,"match",e.target.value)}><option>{item.match}</option><option>Create as new product</option><option>No match — choose product</option></Select><Input type="number" value={item.qty} onChange={e=>update(i,"qty",Number(e.target.value))} /><Input type="number" value={item.cost} onChange={e=>update(i,"cost",Number(e.target.value))} /></div><div className="mt-1 grid grid-cols-[1fr_72px_90px] gap-2 text-[10px] text-slate-400"><span>Product match</span><span>Quantity</span><span>Unit cost</span></div>{item.confidence < 60 && <p className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-700"><Icon name="warning" size={13} />No confident catalogue match. This will create a new product.</p>}</div></div></div>)}</div><div className="flex items-center justify-between border-t border-slate-100 p-4"><p className="text-xs text-slate-500">{items.filter(x=>x.included).length} of {items.length} items included</p><Button onClick={onNext}>Continue to import <Icon name="arrow" size={15} /></Button></div></Card>;
}

function ImportConfirm({ items, total, onBack, onImport, loading }: { items: InvoiceItem[]; total: number; onBack: () => void; onImport: () => void; loading: boolean }) {
  const count = items.filter(x=>x.included).reduce((s,x)=>s+x.qty,0);
  return <div className="mx-auto max-w-4xl"><div className="grid gap-4 sm:grid-cols-3"><MetricCard title="Items to import" value={`${items.filter(x=>x.included).length}`} meta={`${count} total units`} icon="box" /><MetricCard title="Purchase value" value={currency(total)} meta="Before GST adjustments" icon="cart" tone="blue" /><MetricCard title="New products" value="1" meta="Will be added to catalogue" icon="plus" tone="amber" /></div><Card className="mt-4"><div className="border-b border-slate-100 p-5"><h2 className="font-bold text-slate-900">Expected stock changes</h2><p className="text-xs text-slate-500">Review the final changes before importing.</p></div><div className="divide-y divide-slate-100">{items.filter(x=>x.included).map(x=><div className="flex items-center gap-4 px-5 py-3 text-sm" key={x.name}><span className="grid size-8 place-items-center rounded bg-slate-100 text-slate-500"><Icon name="box" size={15} /></span><div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-800">{x.match}</p><p className="text-xs text-slate-400">{currency(x.cost)} per unit</p></div><span className="text-slate-500">Current {products.find(p=>p.name===x.match)?.stock || 0}</span><Icon name="arrow" size={14} /><strong className="text-emerald-700">+{x.qty} units</strong></div>)}</div><div className="m-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><Icon name="warning" className="mt-0.5 shrink-0" /><div><strong>1 validation note</strong><p className="mt-1 text-xs">CLEANMAX FLOOR 1L will be created without a barcode. You can add one later from Products.</p></div></div><div className="flex justify-between border-t border-slate-100 p-4"><Button variant="secondary" onClick={onBack}>Back to review</Button><Button disabled={loading} onClick={onImport}>{loading ? "Updating inventory…" : "Confirm and import"}<Icon name="check" size={15} /></Button></div></Card></div>;
}

const screenData: Record<string, { title: string; desc: string; cols: string[]; rows: string[][] }> = {
  Purchases: { title: "Purchases", desc: "Track supplier invoices, payments and purchase history.", cols: ["Invoice", "Supplier", "Date", "Items", "Amount", "Status"], rows: [["SRS-1824","Shree Ram Suppliers","22 Mar 2025","4","₹10,238","Paid"],["MFD-8842","Metro Foods Distributors","19 Mar 2025","18","₹48,620","Due in 4 days"],["ICP-1092","Indore Consumer Products","16 Mar 2025","11","₹32,450","Paid"],["SKT-7702","Shakti Traders","12 Mar 2025","8","₹18,940","Overdue"]] },
  Sales: { title: "Sales", desc: "Monitor sales performance and product movement.", cols: ["Period", "Orders", "Gross sales", "Cost", "Gross profit", "Margin"], rows: [["This week","842","₹2,18,420","₹1,68,180","₹50,240","23.0%"],["Last week","806","₹2,04,280","₹1,59,340","₹44,940","22.0%"],["01–07 Mar","774","₹1,94,840","₹1,53,240","₹41,600","21.4%"]] },
  Suppliers: { title: "Suppliers", desc: "Manage supplier relationships, terms and purchasing trends.", cols: ["Supplier", "Products", "Last purchase", "YTD spend", "Payment terms", "Status"], rows: [["Shree Ram Suppliers","146","22 Mar 2025","₹4,82,600","15 days","Active"],["Metro Foods Distributors","84","19 Mar 2025","₹3,18,240","30 days","Active"],["Indore Consumer Products","61","16 Mar 2025","₹2,72,410","15 days","Active"],["Shakti Traders","38","12 Mar 2025","₹1,46,820","On delivery","Review"]] },
  "Purchase Intelligence": { title: "Purchase Intelligence", desc: "Spot cost changes, margin risks and better supplier prices.", cols: ["Product", "Current cost", "Change", "Margin impact", "Best alternative", "Opportunity"], rows: [["Fortune Sunflower Oil 1L","₹114.50","+8.2%","−2.1 pts","Metro Foods · ₹109","Save ₹5.50/unit"],["Surf Excel Easy Wash 1 kg","₹128.00","+6.7%","−1.8 pts","Shakti Traders · ₹124","Save ₹4/unit"],["Dove Bathing Bar 3×125 g","₹171.00","+4.4%","−1.2 pts","Current supplier","Review selling price"],["Tata Salt 1 kg","₹24.00","0.0%","No change","Current supplier","Best price"]] },
  "Dead Stock": { title: "Dead Stock", desc: "Recover capital from slow-moving and aging inventory.", cols: ["Product", "Stock", "Value tied up", "Last sale", "Days idle", "Suggested action"], rows: [["Kissan Mixed Fruit Jam 500 g","24","₹3,840","14 Dec 2024","99","Bundle & discount"],["Godrej Aer Pocket 10 g","42","₹2,730","28 Dec 2024","85","20% markdown"],["Horlicks Classic 500 g","12","₹3,960","06 Jan 2025","76","Return to supplier"],["Nivea Body Lotion 400 ml","9","₹2,430","18 Jan 2025","64","Promote at checkout"]] },
  "Replenishment Planner": { title: "Replenishment Planner", desc: "Prevent stockouts with demand-aware reorder suggestions.", cols: ["Product", "On hand", "Daily sales", "Stockout in", "Suggested reorder", "Why"], rows: [["Surf Excel Easy Wash 1 kg","9","2.4","4 days","36 units","14 days cover + lead time"],["Aashirvaad Atta 5 kg","18","3.2","6 days","42 units","Demand up 18%"],["Britannia Good Day 600 g","0","1.8","Out now","30 units","Urgent stockout"],["Fortune Sunflower Oil 1L","42","4.1","10 days","24 units","Supplier lead time: 5 days"]] },
};

function DataScreen({ name }: { name: string }) {
  const data = screenData[name];
  return <><PageHeader title={data.title} description={data.desc} actions={<><Select><option>Last 30 days</option><option>Last quarter</option></Select><Button><Icon name="plus" size={16} />{name === "Suppliers" ? "Add supplier" : "Export view"}</Button></>} /><div className="grid gap-3 sm:grid-cols-3"><MetricCard title={name === "Dead Stock" ? "Capital tied up" : "Total value"} value={name === "Dead Stock" ? "₹42,680" : "₹3,24,820"} meta="Across this filtered view" icon="report" /><MetricCard title="Needs attention" value={name === "Replenishment Planner" ? "6" : "4"} meta="Prioritized actions" icon="warning" tone="amber" /><MetricCard title="Potential impact" value="₹18,400" meta="Estimated over 30 days" icon="trend" tone="blue" /></div><Card className="mt-4"><div className="flex gap-3 border-b border-slate-100 p-4"><div className="relative flex-1"><Icon className="absolute left-3 top-2.5 text-slate-400" name="search" size={16} /><Input className="pl-9" placeholder={`Search ${name.toLowerCase()}…`} /></div><Button variant="secondary"><Icon name="filter" size={15} />Filters</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr>{data.cols.map(c=><th className="px-5 py-3 font-semibold" key={c}>{c}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.rows.map((row,i)=><tr className="hover:bg-slate-50" key={i}>{row.map((cell,j)=><td className={`px-5 py-4 ${j===0 ? "font-semibold text-slate-800" : "text-slate-600"} ${cell.includes("+") ? "text-rose-600" : ""}`} key={j}>{j===row.length-1 ? <Badge tone={cell.includes("Overdue") || cell.includes("Review") ? "warning" : "success"}>{cell}</Badge> : cell}</td>)}</tr>)}</tbody></table></div></Card></>;
}

function AIAssistant() {
  const [messages, setMessages] = useState([{ role: "ai", text: "Hello Amit. I can analyse your inventory, purchases and product movement. What would you like to know?" }]);
  const [value, setValue] = useState("");
  const ask = (text: string) => { if(!text.trim()) return; setMessages(m=>[...m,{role:"user",text},{role:"ai",text:"Based on the last 30 days, Aashirvaad Atta and Surf Excel need attention first. At current sales velocity, they may stock out within 6 and 4 days. Reordering 42 and 36 units respectively would provide roughly two weeks of cover."}]); setValue(""); };
  return <><PageHeader title="AI Assistant" description="Ask evidence-based questions about your inventory." /><Card className="grid min-h-[650px] overflow-hidden lg:grid-cols-[260px_1fr]"><aside className="border-b border-slate-200 bg-slate-50 p-4 lg:border-b-0 lg:border-r"><Button className="w-full"><Icon name="plus" size={15} />New conversation</Button><p className="mt-6 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Suggested questions</p><div className="mt-2 space-y-2">{["What should I reorder this week?","Which items are hurting margin?","Show my dead stock risk","Compare supplier prices"].map(q=><button className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-medium leading-5 text-slate-600 hover:border-emerald-300 hover:text-emerald-700" key={q} onClick={()=>ask(q)}>{q}</button>)}</div></aside><div className="flex min-w-0 flex-col"><div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-8">{messages.map((m,i)=><div className={`flex gap-3 ${m.role==="user" ? "justify-end" : ""}`} key={i}>{m.role==="ai" && <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white"><Icon name="spark" size={16} /></span>}<div className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-6 ${m.role==="user" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{m.text}{m.role==="ai" && i>0 && <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3"><Badge tone="info">Sales: last 30 days</Badge><Badge tone="success">Inventory: live mock data</Badge></div>}</div></div>)}</div><div className="border-t border-slate-100 p-4"><div className="flex gap-2"><Input placeholder="Ask about stock, margins or suppliers…" value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask(value)} /><Button onClick={()=>ask(value)}><Icon name="send" size={16} /><span className="hidden sm:inline">Ask</span></Button></div><p className="mt-2 text-center text-[10px] text-slate-400">Responses use simulated prototype data and may not reflect real inventory.</p></div></div></Card></>;
}

function Reports() {
  const [generated, setGenerated] = useState(true);
  return <><PageHeader title="Reports" description="Generate and export reports for business review." actions={<Button onClick={()=>setGenerated(!generated)}><Icon name="report" size={16} />Generate report</Button>} /><Card className="p-4"><div className="grid gap-3 sm:grid-cols-4"><label className="text-xs font-semibold text-slate-500">Report type<Select className="mt-1.5 w-full"><option>Inventory valuation</option><option>Gross margin</option><option>Stock movement</option><option>Purchases</option></Select></label><label className="text-xs font-semibold text-slate-500">From<Input className="mt-1.5" type="date" defaultValue="2025-03-01" /></label><label className="text-xs font-semibold text-slate-500">To<Input className="mt-1.5" type="date" defaultValue="2025-03-31" /></label><label className="text-xs font-semibold text-slate-500">Category<Select className="mt-1.5 w-full"><option>All categories</option><option>Grocery</option></Select></label></div></Card>{generated ? <><div className="mt-4 grid gap-3 sm:grid-cols-3"><MetricCard title="Opening value" value="₹11,82,400" meta="As of 01 Mar 2025" icon="box" /><MetricCard title="Closing value" value="₹12,48,620" meta="As of 31 Mar 2025" icon="trend" tone="blue" /><MetricCard title="Net movement" value="+₹66,220" meta="+5.6% during period" icon="refresh" tone="emerald" /></div><Card className="mt-4 p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Inventory valuation by category</h2><p className="text-xs text-slate-500">As of 31 March 2025</p></div><Button variant="secondary">Export CSV</Button></div><div className="mt-6 space-y-5">{[["Grocery",78, "₹5,24,420"],["Personal care",52,"₹3,48,280"],["Home care",36,"₹2,42,160"],["Snacks & beverages",20,"₹1,33,760"]].map(x=><div key={x[0]}><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-slate-700">{x[0]}</span><strong>{x[2]}</strong></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{width:`${x[1]}%`}} /></div></div>)}</div></Card></> : <Card className="mt-4 grid place-items-center py-24 text-center"><Icon name="report" className="text-slate-300" size={36} /><h2 className="mt-3 font-bold text-slate-800">Choose filters to generate a report</h2><p className="mt-1 text-sm text-slate-500">Your results will appear here.</p></Card>}</>;
}

function Settings() { return <><PageHeader title="Settings" description="Manage your business profile and inventory preferences." /><div className="grid gap-4 lg:grid-cols-[220px_1fr]"><Card className="h-fit p-2">{["Business profile","Inventory rules","Tax & currency","Notifications","Team access"].map((x,i)=><button className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium ${i===0?"bg-emerald-50 text-emerald-700":"text-slate-600 hover:bg-slate-50"}`} key={x}>{x}</button>)}</Card><Card><div className="border-b border-slate-100 p-5"><h2 className="font-bold text-slate-900">Business profile</h2><p className="text-xs text-slate-500">Used across invoices, reports and purchase records.</p></div><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Business name<Input className="mt-1.5" defaultValue="Verma Mini Mart" /></label><label className="text-xs font-semibold text-slate-600">GSTIN<Input className="mt-1.5" defaultValue="23AAGFV1824Q1ZP" /></label><label className="text-xs font-semibold text-slate-600">Phone<Input className="mt-1.5" defaultValue="+91 98260 18420" /></label><label className="text-xs font-semibold text-slate-600">Email<Input className="mt-1.5" defaultValue="amit@vermaminimart.in" /></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Address<Input className="mt-1.5" defaultValue="42, Scheme No. 54, Vijay Nagar, Indore, Madhya Pradesh" /></label></div><div className="flex justify-end border-t border-slate-100 p-4"><Button>Save changes</Button></div></Card></div></>; }

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
  const [sidebar, setSidebar] = useState(false);

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

  const render = () => {
    if (active === "Overview") return <Overview onNavigate={setActive} />;
    if (active === "Inventory") return <Inventory />;
    if (active === "Products") return <Inventory productsMode />;
    if (active === "Invoice Scanner") return <InvoiceScanner />;
    if (screenData[active]) return <DataScreen name={active} />;
    if (active === "AI Assistant") return <AIAssistant />;
    if (active === "Reports") return <Reports />;
    if (active === "Settings") return <Settings />;
    return <Overview onNavigate={setActive} />;
  };

  if (!authenticated) return <AuthScreen onAuthenticated={(user) => { setCurrentUser(user); setAuthenticated(true); }} />;

  return <div className="min-h-screen bg-slate-50 text-slate-700"><Sidebar active={active} onNavigate={setActive} open={sidebar} onClose={()=>setSidebar(false)} onLogout={() => { logout(); setCurrentUser(null); setAuthenticated(false); setSidebar(false); }} user={currentUser} />{sidebar && <button aria-label="Close sidebar" className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={()=>setSidebar(false)} />}<div className="lg:pl-64"><Header onMenu={()=>setSidebar(true)} onNavigate={setActive} /><main className="mx-auto max-w-[1600px] p-4 sm:p-6">{render()}</main></div></div>;
}
