import { useState, useEffect } from "react";
import { getInvoices } from "../../services/api";
import "./invoices.css";

const STATUS_CLASS = {
  paid: "badge badge-paid",
  pending: "badge badge-pending",
  cancelled: "badge badge-cancelled",
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatAmount(amount) {
  return `$${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const STATUS_OPTIONS = ["paid", "pending", "cancelled"];
const PAYMENT_OPTIONS = ["cash", "card", "bank_transfer", "unknown"];

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      const result = await getInvoices(token);
      if (result.success) {
        setInvoices(result.invoices);
      } else {
        setError(result.message || "Failed to load invoices");
      }
      setLoading(false);
    };
    load();
  }, []);

  const categoryOptions = Array.from(
    new Set(invoices.map((inv) => inv.category).filter(Boolean))
  ).sort();

  const filtered = invoices.filter((inv) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      inv.customerName?.toLowerCase().includes(q) ||
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.itemName?.toLowerCase().includes(q) ||
      inv.category?.toLowerCase().includes(q);

    const matchesStatus = !statusFilter || inv.status === statusFilter;
    const matchesPayment = !paymentFilter || inv.paymentMethod === paymentFilter;
    const matchesCategory = !categoryFilter || inv.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesPayment && matchesCategory;
  });

  const resetFilters = () => {
    setStatusFilter("");
    setPaymentFilter("");
    setCategoryFilter("");
  };

  const hasActiveFilters = statusFilter || paymentFilter || categoryFilter;

  const totalAmount = filtered.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  return (
    <div className="invoices-page">
      <div className="invoices-header">
        <div>
          <h1>Invoices</h1>
          <p>All invoices on record, newest first.</p>
        </div>
        <input
          type="text"
          className="invoices-search"
          placeholder="Search by customer, item, category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="invoices-filters">
        <select
          className="invoices-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <select
          className="invoices-filter-select"
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
        >
          <option value="">All payment methods</option>
          {PAYMENT_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p.replace("_", " ")}
            </option>
          ))}
        </select>

        <select
          className="invoices-filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button className="invoices-clear-filters" onClick={resetFilters}>
            Clear filters
          </button>
        )}
      </div>

      <div className="invoices-summary">
        <div className="summary-card">
          <p className="summary-label">Invoices shown</p>
          <p className="summary-value">{filtered.length}</p>
        </div>
        <div className="summary-card">
          <p className="summary-label">Total amount</p>
          <p className="summary-value">{formatAmount(totalAmount)}</p>
        </div>
      </div>

      <div className="invoices-table-wrapper">
        {loading ? (
          <p className="invoices-status-text">Loading invoices...</p>
        ) : error ? (
          <p className="invoices-status-text invoices-error">{error}</p>
        ) : (
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Item</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr className="invoices-empty-row">
                  <td colSpan="8">No invoices found.</td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv._id}>
                    <td>{inv.invoiceNumber}</td>
                    <td>{formatDate(inv.date)}</td>
                    <td>{inv.customerName}</td>
                    <td>{inv.itemName}</td>
                    <td>{inv.category}</td>
                    <td>{formatAmount(inv.amount)}</td>
                    <td className="invoices-capitalize">
                      {inv.paymentMethod?.replace("_", " ")}
                    </td>
                    <td>
                      <span className={STATUS_CLASS[inv.status] || "badge"}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Invoices;