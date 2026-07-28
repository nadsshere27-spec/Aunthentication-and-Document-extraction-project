import { useState, useEffect, useCallback } from "react";
import {
  getProducts,
  getProductCategories,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../services/api";
import "./products.css";

const EMPTY_FORM = { name: "", category: "", price: "", stock: "" };

function formatPrice(price) {
  return `$${Number(price || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function stockClass(stock) {
  if (stock <= 0) return "stock-badge stock-out";
  if (stock <= 10) return "stock-badge stock-low";
  return "stock-badge stock-ok";
}

function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Add / edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = creating new
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null); // product object or null

  const token = localStorage.getItem("token");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const result = await getProducts(token, {
      category: categoryFilter || undefined,
      search: search || undefined,
    });
    if (result.success) {
      setProducts(result.products);
      setError("");
    } else {
      setError(result.message || "Failed to load products");
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, search]);

  const loadCategories = async () => {
    const result = await getProductCategories(token);
    if (result.success) setCategories(result.categories);
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadProducts, 250); // debounce search typing
    return () => clearTimeout(timeout);
  }, [loadProducts]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim() || !form.category.trim() || form.price === "") {
      setFormError("Name, category and price are required.");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      price: form.price,
      stock: form.stock === "" ? 0 : form.stock,
    };

    const result = editingId
      ? await updateProduct(token, editingId, payload)
      : await createProduct(token, payload);

    setSaving(false);

    if (result.success) {
      closeModal();
      loadProducts();
      loadCategories();
    } else {
      setFormError(result.message || "Something went wrong. Please try again.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteProduct(token, deleteTarget._id);
    setDeleteTarget(null);
    if (result.success) {
      loadProducts();
    } else {
      setError(result.message || "Failed to delete product");
    }
  };

  return (
    <div className="products-page">
      <div className="products-header">
        <div>
          <h1>Products</h1>
          <p>Manage your product catalog — add, edit, and remove items.</p>
        </div>
        <button className="products-add-btn" onClick={openCreateModal}>
          + Add Product
        </button>
      </div>

      <div className="products-filters">
        <input
          type="text"
          className="products-search"
          placeholder="Search by product name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="products-category-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="products-table-wrapper">
        {loading ? (
          <p className="products-status-text">Loading products...</p>
        ) : error ? (
          <p className="products-status-text products-error">{error}</p>
        ) : (
          <table className="products-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr className="products-empty-row">
                  <td colSpan="6">No products found.</td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p._id}>
                    <td>#{p.displayId ?? "-"}</td>
                    <td>{p.name}</td>
                    <td>
                      <span className="category-pill">{p.category}</span>
                    </td>
                    <td>{formatPrice(p.price)}</td>
                    <td>
                      <span className={stockClass(p.stock)}>
                        {p.stock} in stock
                      </span>
                    </td>
                    <td className="products-actions">
                      <button
                        className="action-btn action-edit"
                        onClick={() => openEditModal(p)}
                      >
                        Edit
                      </button>
                      <button
                        className="action-btn action-delete"
                        onClick={() => setDeleteTarget(p)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit modal */}
      {modalOpen && (
        <div className="products-modal-overlay" onClick={closeModal}>
          <div className="products-modal" onClick={(e) => e.stopPropagation()}>
            <div className="products-modal-header">
              <h2>{editingId ? "Edit Product" : "Add Product"}</h2>
              <button className="products-modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="products-form">
              <label>
                Name
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Wireless Mouse"
                />
              </label>

              <label>
                Category
                <input
                  type="text"
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                  placeholder="e.g. Electronics"
                  list="products-category-suggestions"
                />
                <datalist id="products-category-suggestions">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </label>

              <div className="products-form-row">
                <label>
                  Price
                  <input
                    type="number"
                    name="price"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={handleFormChange}
                    placeholder="0.00"
                  />
                </label>

                <label>
                  Stock
                  <input
                    type="number"
                    name="stock"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={handleFormChange}
                    placeholder="0"
                  />
                </label>
              </div>

              {formError && <p className="products-form-error">{formError}</p>}

              <div className="products-form-actions">
                <button
                  type="button"
                  className="products-cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="products-save-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : editingId ? "Save changes" : "Add product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="products-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div
            className="products-modal products-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Delete product?</h2>
            <p>
              This will permanently delete <strong>{deleteTarget.name}</strong>.
              This can't be undone.
            </p>
            <div className="products-form-actions">
              <button
                className="products-cancel-btn"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button className="products-delete-confirm-btn" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;