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

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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

  const filtered = invoices.filter((inv) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      inv.customerName?.toLowerCase().includes(q) ||
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.itemName?.toLowerCase().includes(q) ||
      inv.category?.toLowerCase().includes(q)
    );
  });

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