import { useEffect, useMemo, useState } from "react";
import {
  CustomerEnquiry,
  EnquiryStatus,
  fetchCustomerEnquiries,
  createCustomerEnquiry,
  updateCustomerEnquiry,
  logCustomerFollowUp,
  deleteCustomerEnquiry,
} from "../services/enquiry";

interface CustomerEnquiriesScreenProps {
  onNavigate?: (tab: string) => void;
}

type TimeBlockFilter = "all" | "due" | "upcoming" | "no_followup" | "multiple" | "shopped" | "cancelled";

export function CustomerEnquiriesScreen({ onNavigate }: CustomerEnquiriesScreenProps) {
  const [enquiries, setEnquiries] = useState<CustomerEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [timeBlock, setTimeBlock] = useState<TimeBlockFilter>("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState<CustomerEnquiry | null>(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formProducts, setFormProducts] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formNextFollowUp, setFormNextFollowUp] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState<EnquiryStatus>("PENDING");

  const [followUpModalEnquiry, setFollowUpModalEnquiry] = useState<CustomerEnquiry | null>(null);
  const [callNote, setCallNote] = useState("");
  const [nextCallDate, setNextCallDate] = useState("");
  const [callOutcome, setCallOutcome] = useState<EnquiryStatus>("FOLLOWED_UP");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const todayIso = useMemo(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }, []);

  const getRelativeDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const loadData = () => {
    setLoading(true);
    fetchCustomerEnquiries()
      .then((data) => {
        setEnquiries(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingEnquiry(null);
    setFormName("");
    setFormPhone("");
    setFormProducts("");
    setFormDate("Tomorrow");
    setFormNextFollowUp(getRelativeDate(1));
    setFormNotes("");
    setFormStatus("PENDING");
    setErrorMsg("");
    setShowAddModal(true);
  };

  const openEditModal = (item: CustomerEnquiry) => {
    setEditingEnquiry(item);
    setFormName(item.customerName);
    setFormPhone(item.phone);
    setFormProducts(item.productsInterested || "");
    setFormDate(item.expectedVisitDate || "");
    setFormNextFollowUp(item.nextFollowUpDate || "");
    setFormNotes(item.notes || "");
    setFormStatus(item.status);
    setErrorMsg("");
    setShowAddModal(true);
  };

  const openFollowUpModal = (item: CustomerEnquiry) => {
    setFollowUpModalEnquiry(item);
    setCallNote("");
    setNextCallDate(getRelativeDate(3));
    setCallOutcome(item.status === "PENDING" ? "FOLLOWED_UP" : item.status);
    setErrorMsg("");
  };

  const handleSaveEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg("Customer name is required");
      return;
    }
    if (!formPhone.trim()) {
      setErrorMsg("Phone number is required");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      if (editingEnquiry) {
        await updateCustomerEnquiry(editingEnquiry.id, {
          customerName: formName.trim(),
          phone: formPhone.trim(),
          productsInterested: formProducts.trim() || undefined,
          expectedVisitDate: formDate.trim() || undefined,
          nextFollowUpDate: formNextFollowUp || undefined,
          status: formStatus,
          notes: formNotes.trim() || undefined,
        });
      } else {
        await createCustomerEnquiry({
          customerName: formName.trim(),
          phone: formPhone.trim(),
          productsInterested: formProducts.trim() || undefined,
          expectedVisitDate: formDate.trim() || undefined,
          nextFollowUpDate: formNextFollowUp || undefined,
          notes: formNotes.trim() || undefined,
        });
      }

      setShowAddModal(false);
      loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to save customer enquiry");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpModalEnquiry) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      await logCustomerFollowUp(followUpModalEnquiry.id, {
        nextFollowUpDate: nextCallDate || undefined,
        callNote: callNote.trim() || undefined,
        status: callOutcome,
      });

      setFollowUpModalEnquiry(null);
      loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to log follow-up");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this enquiry?")) {
      return;
    }
    try {
      await deleteCustomerEnquiry(id);
      setEnquiries((prev) => prev.filter((item) => item.id !== id));
    } catch {
      loadData();
    }
  };

  const stats = useMemo(() => {
    const total = enquiries.length;
    const pending = enquiries.filter((e) => e.status === "PENDING" || e.status === "FOLLOWED_UP");
    const due = pending.filter((e) => e.nextFollowUpDate && e.nextFollowUpDate <= todayIso).length;
    const noFollowup = enquiries.filter((e) => e.followUpCount === 0 && e.status !== "CONVERTED" && e.status !== "CANCELLED").length;
    const converted = enquiries.filter((e) => e.status === "CONVERTED").length;
    const rate = total > 0 ? Math.round((converted / total) * 100) : 0;
    return { total, due, noFollowup, converted, rate };
  }, [enquiries, todayIso]);

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((item) => {
      if (timeBlock === "due") {
        if (item.status === "CONVERTED" || item.status === "CANCELLED") return false;
        if (!item.nextFollowUpDate || item.nextFollowUpDate > todayIso) return false;
      } else if (timeBlock === "upcoming") {
        if (item.status === "CONVERTED" || item.status === "CANCELLED") return false;
        if (!item.nextFollowUpDate || item.nextFollowUpDate <= todayIso) return false;
      } else if (timeBlock === "no_followup") {
        if (item.followUpCount !== 0 || item.status === "CONVERTED" || item.status === "CANCELLED") return false;
      } else if (timeBlock === "multiple") {
        if (item.followUpCount < 2) return false;
      } else if (timeBlock === "shopped") {
        if (item.status !== "CONVERTED") return false;
      } else if (timeBlock === "cancelled") {
        if (item.status !== "CANCELLED") return false;
      }

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.customerName.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        (item.productsInterested && item.productsInterested.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        (item.followUpNotes && item.followUpNotes.toLowerCase().includes(q))
      );
    });
  }, [enquiries, timeBlock, search, todayIso]);

  const getCleanPhone = (phone: string) => {
    return phone.replace(/[^0-9]/g, "");
  };

  const getWhatsAppUrl = (phone: string, customerName: string, products?: string) => {
    const clean = getCleanPhone(phone);
    const text = `Hello ${customerName}, following up regarding your enquiry for ${products || "our products"} at our shop. Please let us know if you would like us to reserve the items or need any pricing details.`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  };

  const renderDueDateBadge = (item: CustomerEnquiry) => {
    if (item.status === "CONVERTED" || item.status === "CANCELLED") {
      return null;
    }
    if (!item.nextFollowUpDate) {
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          No follow-up scheduled
        </span>
      );
    }

    if (item.nextFollowUpDate < todayIso) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-600/20">
          Overdue: {item.nextFollowUpDate}
        </span>
      );
    }

    if (item.nextFollowUpDate === todayIso) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 ring-1 ring-amber-600/30">
          Due Today ({item.nextFollowUpDate})
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-600/20">
        Follow-up: {item.nextFollowUpDate}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Customer Enquiries & Follow-up Tracker
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Track walk-in prospects, increment follow-up calls, schedule future reminders, and monitor conversions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Refresh
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            + New Walk-in Enquiry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Enquiries</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{stats.total}</p>
          <p className="mt-1 text-xs text-slate-400">All registered customer leads</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm">
          <p className="text-xs font-semibold text-rose-800">Due / Overdue Calls</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-rose-700">{stats.due}</p>
          <p className="mt-1 text-xs text-rose-600">Requires follow-up today or past due</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-800">No Follow-up Yet</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-700">{stats.noFollowup}</p>
          <p className="mt-1 text-xs text-amber-600">New leads with 0 calls logged</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-800">Shopped & Converted</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
            {stats.converted} <span className="text-xs font-normal text-emerald-600">({stats.rate}%)</span>
          </p>
          <p className="mt-1 text-xs text-emerald-600">Successfully closed sales</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "all", label: `All (${enquiries.length})` },
                { key: "due", label: `Due / Overdue (${stats.due})` },
                { key: "upcoming", label: "Upcoming Scheduled" },
                { key: "no_followup", label: `No Follow-up Yet (${stats.noFollowup})` },
                { key: "multiple", label: "2+ Follow-ups" },
                { key: "shopped", label: `Shopped (${stats.converted})` },
                { key: "cancelled", label: "Closed" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setTimeBlock(tab.key as TimeBlockFilter)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    timeBlock === tab.key
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="w-full lg:w-80">
              <input
                type="text"
                placeholder="Search name, phone, items, call notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">Loading enquiries...</div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">No matching customer enquiries</p>
            <p className="mt-1 text-xs text-slate-400">Try adjusting your filters or search query.</p>
            <button
              onClick={openAddModal}
              className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              + Add New Enquiry
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEnquiries.map((enquiry) => (
              <div key={enquiry.id} className="p-4 transition hover:bg-slate-50/70">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-slate-900">
                        {enquiry.customerName}
                      </span>

                      {enquiry.status === "CONVERTED" && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          Shopped / Converted
                        </span>
                      )}
                      {enquiry.status === "CANCELLED" && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          Closed
                        </span>
                      )}
                      {enquiry.status !== "CONVERTED" && enquiry.status !== "CANCELLED" && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                          {enquiry.status === "PENDING" ? "Awaiting Visit" : "In Progress"}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        Follow-ups: {enquiry.followUpCount}x
                      </span>

                      {renderDueDateBadge(enquiry)}

                      {enquiry.expectedVisitDate && (
                        <span className="text-xs text-slate-500">
                          Initial target: {enquiry.expectedVisitDate}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="font-mono font-medium text-slate-800">{enquiry.phone}</span>
                      <a
                        href={`tel:${getCleanPhone(enquiry.phone)}`}
                        className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        Call Customer
                      </a>
                      <span className="text-slate-300">|</span>
                      <a
                        href={getWhatsAppUrl(enquiry.phone, enquiry.customerName, enquiry.productsInterested)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        WhatsApp
                      </a>
                    </div>

                    {enquiry.productsInterested && (
                      <p className="text-xs text-slate-700">
                        <span className="font-semibold text-slate-500">Products of interest: </span>
                        {enquiry.productsInterested}
                      </p>
                    )}

                    {enquiry.notes && (
                      <p className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-400">Walk-in note: </span>
                        {enquiry.notes}
                      </p>
                    )}

                    {enquiry.followUpNotes && (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs">
                        <p className="font-semibold text-slate-600 mb-1">Follow-up Call History:</p>
                        <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed text-[11px]">
                          {enquiry.followUpNotes}
                        </pre>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400 pt-1">
                      Created on: {new Date(enquiry.createdAt).toLocaleDateString()}
                      {enquiry.lastFollowedUpAt && (
                        <> | Last call logged: {new Date(enquiry.lastFollowedUpAt).toLocaleDateString()} at {new Date(enquiry.lastFollowedUpAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start shrink-0">
                    <button
                      onClick={() => openFollowUpModal(enquiry)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                      + Log Call / Reschedule
                    </button>
                    <button
                      onClick={() => openEditModal(enquiry)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(enquiry.id)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingEnquiry ? "Edit Customer Enquiry" : "New Customer Walk-in Enquiry"}
                </h3>
                <p className="text-xs text-slate-500">Record customer phone, interests, and reminder date.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveEnquiry} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Product / Items Interested In</label>
                <input
                  type="text"
                  placeholder="e.g. 43-inch 4K TV, 10m HDMI cables"
                  value={formProducts}
                  onChange={(e) => setFormProducts(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Customer Promised Visit Time</label>
                <input
                  type="text"
                  placeholder="e.g. Next Monday afternoon"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Next Follow-up Reminder Date</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {[
                    { label: "Tomorrow", val: getRelativeDate(1) },
                    { label: "In 3 Days", val: getRelativeDate(3) },
                    { label: "Next Week", val: getRelativeDate(7) },
                    { label: "In 2 Weeks", val: getRelativeDate(14) },
                  ].map((p) => (
                    <button
                      type="button"
                      key={p.label}
                      onClick={() => setFormNextFollowUp(p.val)}
                      className={`rounded px-2 py-1 text-xs transition ${
                        formNextFollowUp === p.val
                          ? "bg-emerald-100 font-semibold text-emerald-800 ring-1 ring-emerald-500/30"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  value={formNextFollowUp}
                  onChange={(e) => setFormNextFollowUp(e.target.value)}
                  className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {editingEnquiry && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as EnquiryStatus)}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="PENDING">Pending Visit</option>
                    <option value="FOLLOWED_UP">In Progress (Followed Up)</option>
                    <option value="CONVERTED">Shopped / Converted</option>
                    <option value="CANCELLED">Closed</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Promised 5% discount if they buy both units."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingEnquiry ? "Update Enquiry" : "Save Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {followUpModalEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Log Follow-up Call #{followUpModalEnquiry.followUpCount + 1}
                </h3>
                <p className="text-xs text-slate-500">
                  Customer: <span className="font-semibold text-slate-800">{followUpModalEnquiry.customerName}</span> ({followUpModalEnquiry.phone})
                </p>
              </div>
              <button
                onClick={() => setFollowUpModalEnquiry(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogFollowUp} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Call Outcome / Lead Status</label>
                <select
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value as EnquiryStatus)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="FOLLOWED_UP">Still Deciding / Rescheduled Next Call</option>
                  <option value="CONVERTED">Customer Shopped / Converted</option>
                  <option value="CANCELLED">Customer Declined / Close Lead</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">What did the customer say?</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Customer said they are still deciding and will visit next week after comparing options."
                  value={callNote}
                  onChange={(e) => setCallNote(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {callOutcome !== "CONVERTED" && callOutcome !== "CANCELLED" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Next Follow-up Reminder Date</label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {[
                      { label: "Tomorrow", val: getRelativeDate(1) },
                      { label: "In 3 Days", val: getRelativeDate(3) },
                      { label: "Next Week", val: getRelativeDate(7) },
                      { label: "In 2 Weeks", val: getRelativeDate(14) },
                    ].map((p) => (
                      <button
                        type="button"
                        key={p.label}
                        onClick={() => setNextCallDate(p.val)}
                        className={`rounded px-2 py-1 text-xs transition ${
                          nextCallDate === p.val
                            ? "bg-emerald-100 font-semibold text-emerald-800 ring-1 ring-emerald-500/30"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="date"
                    value={nextCallDate}
                    onChange={(e) => setNextCallDate(e.target.value)}
                    className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setFollowUpModalEnquiry(null)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? "Logging..." : "Save Follow-up Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
