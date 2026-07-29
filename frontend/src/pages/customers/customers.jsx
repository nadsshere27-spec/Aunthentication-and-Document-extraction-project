import { useState, useEffect } from "react";
import { getCustomers, getCustomerInvoices } from "../../services/api";
import "./customers.css";

function formatAmount(amount) {
  return `$${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "", "paid", "pending", "cancelled"

  const [activeCustomer, setActiveCustomer] = useState(null); // name of drilled-down customer
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      const result = await getCustomers(token);
      if (result.success) {
        setCustomers(result.customers);
      } else {
        setError(result.message || "Failed to load customers");
      }
      setLoading(false);
    };
    load();
  }, []);

  const openCustomer = async (name) => {
    setActiveCustomer(name);
    setLoadingInvoices(true);
    const token = localStorage.getItem("token");
    const result = await getCustomerInvoices(token, name);
    if (result.success) {
      setCustomerInvoices(result.invoices);
    } else {
      setCustomerInvoices([]);
    }
    setLoadingInvoices(false);
  };

  const closeDrawer = () => {
    setActiveCustomer(null);
    setCustomerInvoices([]);
  };

  const STATUS_COUNT_KEY = {
    paid: "paidCount",
    pending: "pendingCount",
    cancelled: "cancelledCount",
  };

  const filtered = customers.filter((c) => {
    const matchesSearch = c.customerName
      ?.toLowerCase()
      .includes(search.trim().toLowerCase());

    const matchesStatus =
      !statusFilter || (c[STATUS_COUNT_KEY[statusFilter]] || 0) > 0;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="customers-page">
      <div className="customers-header">
        <div>
          <h1>Customers</h1>
          <p>Every customer who appears on an invoice, with their totals.</p>
        </div>
        <input
          type="text"
          className="customers-search"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="customers-filters">
        <select
          className="customers-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All customers</option>
          <option value="paid">Has paid invoices</option>
          <option value="pending">Has pending invoices</option>
          <option value="cancelled">Has cancelled invoices</option>
        </select>

        {statusFilter && (
          <button
            className="customers-clear-filters"
            onClick={() => setStatusFilter("")}
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="customers-table-wrapper">
        {loading ? (
          <p className="customers-status-text">Loading customers...</p>
        ) : error ? (
          <p className="customers-status-text customers-error">{error}</p>
        ) : (
          <table className="customers-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th># Invoices</th>
                <th>Total spent</th>
                <th>Paid / Pending / Cancelled</th>
                <th>Last invoice</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr className="customers-empty-row">
                  <td colSpan="6">No customers found.</td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.customerName}>
                    <td>{c.customerName}</td>
                    <td>{c.totalInvoices}</td>
                    <td>{formatAmount(c.totalSpent)}</td>
                    <td className="customers-breakdown">
                      <span className="dot dot-paid" />{c.paidCount}
                      <span className="dot dot-pending" />{c.pendingCount}
                      <span className="dot dot-cancelled" />{c.cancelledCount}
                    </td>
                    <td>{formatDate(c.lastInvoiceDate)}</td>
                    <td>
                      <button
                        className="customers-view-btn"
                        onClick={() => openCustomer(c.customerName)}
                      >
                        View invoices
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {activeCustomer && (
        <div className="customers-drawer-overlay" onClick={closeDrawer}>
          <div className="customers-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="customers-drawer-header">
              <h2>{activeCustomer}</h2>
              <button className="customers-drawer-close" onClick={closeDrawer}>
                ×
              </button>
            </div>

            {loadingInvoices ? (
              <p className="customers-status-text">Loading invoices...</p>
            ) : (
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customerInvoices.length === 0 ? (
                    <tr className="customers-empty-row">
                      <td colSpan="5">No invoices for this customer.</td>
                    </tr>
                  ) : (
                    customerInvoices.map((inv) => (
                      <tr key={inv._id}>
                        <td>{inv.invoiceNumber}</td>
                        <td>{formatDate(inv.date)}</td>
                        <td>{inv.itemName}</td>
                        <td>{formatAmount(inv.amount)}</td>
                        <td className="customers-capitalize">{inv.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;