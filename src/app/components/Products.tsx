import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { Plus, Search, Edit, Trash2, RotateCcw, X } from "lucide-react";
import { getProducts, deleteProduct, getCategories, recordWasteOrTransfer, updateProduct } from "../utils/storage";
import { Product } from "../types";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import ExportEquipment from "./ExportEquipment";

type WasteOrTransferAction = "waste" | "transferred" | "repair";

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [recordModal, setRecordModal] = useState<{
    open: boolean;
    product: Product | null;
    action: WasteOrTransferAction;
    quantity: string;
    name: string;
    notes: string;
    currentAssignedUser: string;
  }>({
    open: false,
    product: null,
    action: "transferred",
    quantity: "1",
    name: "",
    notes: "",
    currentAssignedUser: "",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [repairConfirmDialog, setRepairConfirmDialog] = useState<{
    open: boolean;
    product: Product | null;
    newStatus: string;
  }>({
    open: false,
    product: null,
    newStatus: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const prods = await getProducts();
    const cats = await getCategories();
    setProducts(prods);
    setCategories(cats.map((c) => c.name));
  };

  const handleDeleteClick = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete);
      await loadData();
    } catch (err) {
      alert("Error deleting product: " + (err as Error).message);
    }
    setProductToDelete(null);
  };

  const openRecordModal = (product: Product) => {
    setRecordModal({
      open: true,
      product,
      action: "transferred",
      quantity: "1",
      name: "",
      notes: "",
      currentAssignedUser: product.assignedPerson || "",
    });
  };

  const closeRecordModal = () => {
    setRecordModal((prev) => ({ ...prev, open: false, product: null }));
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { product, action, quantity, name, notes } = recordModal;
    if (!product) return;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      window.alert("Please enter a valid quantity (1 or more).");
      return;
    }
    if (qty > product.quantity) {
      window.alert(`Quantity cannot exceed current stock (${product.quantity}).`);
      return;
    }
    try {
      await recordWasteOrTransfer(product.id, product.name, product.sku, qty, action, name.trim() || undefined, notes.trim() || undefined, recordModal.currentAssignedUser);
      await loadData();
      closeRecordModal();
    } catch (err) {
      alert("Error recording waste/transfer: " + (err as Error).message);
    }
  };

  const handleServiceableStatusUpdate = async (product: Product, status: string) => {
    // Check if status is being changed to repair-related or serviceable status (requires confirmation)
    if (status === "Under Repair" || status === "For Repair" || status === "Serviceable") {
      setRepairConfirmDialog({
        open: true,
        product,
        newStatus: status,
      });
      return;
    }

    // For non-confirmation statuses, update directly
    try {
      await updateProduct(product.id, { serviceable: status });
      await loadData();
    } catch (err) {
      alert("Error updating service status: " + (err as Error).message);
    }
  };

  const handleRepairConfirm = async () => {
    const { product, newStatus } = repairConfirmDialog;
    if (!product) return;

    try {
      await updateProduct(product.id, { serviceable: newStatus });
      await loadData();
      setRepairConfirmDialog({ open: false, product: null, newStatus: "" });
    } catch (err) {
      alert("Error updating service status: " + (err as Error).message);
    }
  };

  const handleRepairCancel = () => {
    setRepairConfirmDialog({ open: false, product: null, newStatus: "" });
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.assignedPerson.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;

    const matchesDivision =
      divisionFilter === "all" || product.division === divisionFilter;

    return matchesSearch && matchesCategory && matchesDivision;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-semibold mb-2">Equipment</h1>
          <p className="text-gray-600">Manage your inventory items</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportEquipment />
          <Link
            to="/products/add"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="size-5" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, property no., or assigned person..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Divisions</option>
            <option value="PDP">PDP</option>
            <option value="Admin">Admin</option>
            <option value="Motorpool">Motorpool</option>
            <option value="Construction">Construction</option>
            <option value="MQC">MQC</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-700">P. O NUMBER</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">PROPERTY NO.</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">CATEGORY</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Division</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Assigned Person</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Quantity</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Accountable Person</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Serviceable</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Notes</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-600">{product.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{product.sku}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{product.division || "—"}</td>
                    <td className="px-6 py-4 text-gray-700">{product.assignedPerson}</td>
                    <td className="px-6 py-4 font-medium">{product.quantity}</td>
                    <td className="px-6 py-4 text-gray-700">{product.accountablePerson ?? "—"}</td>
                    <td className="px-6 py-4">
                      <select
                        value={product.serviceable ?? "Serviceable"}
                        onChange={(e) => handleServiceableStatusUpdate(product, e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded-lg"
                      >
                        <option value="Serviceable">Serviceable</option>
                        <option value="Under Repair">Under Repair</option>
                        <option value="For Repair">For Repair</option>
                        <option value="For Disposal/Waste">For Disposal/Waste</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{product.notes ?? "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openRecordModal(product)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Record as Waste or Transferred"
                        >
                          <RotateCcw className="size-4" />
                        </button>
                        <Link
                          to={`/products/edit/${product.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit className="size-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(product.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 text-gray-600">
        Showing {filteredProducts.length} of {products.length} Equipment
      </div>

      {/* Record (Waste / Transferred) Modal */}
      {recordModal.open && recordModal.product && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="font-semibold text-lg">Record item</h2>
              <button
                type="button"
                onClick={closeRecordModal}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={handleRecordSubmit} className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-800">{recordModal.product.name}</span>
                {" "}(Property No: {recordModal.product.sku})
              </p>

              {recordModal.action === "transferred" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="text-blue-700">
                    <span className="font-medium">Currently assigned to:</span> {recordModal.currentAssignedUser || "Unassigned"}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mark as *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="action"
                      value="waste"
                      checked={recordModal.action === "waste"}
                      onChange={() => setRecordModal((p) => ({ ...p, action: "waste" }))}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span>Waste</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="action"
                      value="transferred"
                      checked={recordModal.action === "transferred"}
                      onChange={() => setRecordModal((p) => ({ ...p, action: "transferred" }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Transferred</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="action"
                      value="repair"
                      checked={recordModal.action === "repair"}
                      onChange={() => setRecordModal((p) => ({ ...p, action: "repair" }))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span>Repaired</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  min={1}
                  max={recordModal.product.quantity}
                  value={recordModal.quantity}
                  onChange={(e) => setRecordModal((p) => ({ ...p, quantity: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-0.5">Available: {recordModal.product.quantity}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="e.g. person or department"
                  value={recordModal.name}
                  onChange={(e) => setRecordModal((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  placeholder="Optional details..."
                  value={recordModal.notes}
                  onChange={(e) => setRecordModal((p) => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Save to History
                </button>
                <button
                  type="button"
                  onClick={closeRecordModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Confirmation Modal */}
      {repairConfirmDialog.open && repairConfirmDialog.product && (() => {
        const isServiceable = repairConfirmDialog.newStatus === "Serviceable";
        const isRepair = repairConfirmDialog.newStatus === "Under Repair" || repairConfirmDialog.newStatus === "For Repair";
        const bgColor = isServiceable ? "bg-green-100" : "bg-orange-100";
        const textColor = isServiceable ? "text-green-600" : "text-orange-600";
        const alertBgColor = isServiceable ? "bg-green-50" : "bg-orange-50";
        const alertBorderColor = isServiceable ? "border-green-200" : "border-orange-200";
        const alertTextColor = isServiceable ? "text-green-700" : "text-orange-700";
        const alertTitleColor = isServiceable ? "text-green-800" : "text-orange-800";
        const buttonBgColor = isServiceable ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700";

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 ${bgColor} rounded-full`}>
                    <RotateCcw className={`size-6 ${textColor}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {isServiceable ? "Confirm Status Update" : "Confirm Repair Status"}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {isServiceable ? "Mark equipment as ready for use" : "Equipment requires repair attention"}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="font-medium text-gray-900 mb-1">
                      {repairConfirmDialog.product.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      Property #: {repairConfirmDialog.product.sku}
                    </div>
                    <div className="text-sm text-gray-600">
                      Current Status: {repairConfirmDialog.product.serviceable || "Serviceable"}
                    </div>
                  </div>

                  <div className={`${alertBgColor} border ${alertBorderColor} rounded-lg p-4`}>
                    <div className="flex items-start gap-3">
                      <div className={`${textColor} mt-0.5`}>
                        <svg className="size-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className={`font-medium ${alertTitleColor} mb-1`}>
                          Equipment Status Change
                        </h4>
                        <p className={`text-sm ${alertTextColor}`}>
                          {isServiceable 
                            ? `You are confirming this equipment is now <strong>"${repairConfirmDialog.newStatus}"</strong>. It will be marked as ready for use and available in the system.`
                            : `You are about to change the status to <strong>"${repairConfirmDialog.newStatus}"</strong>. Make sure to update the notes with the required parts and details of the repair needed.`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleRepairConfirm}
                    className={`flex-1 px-4 py-2 ${buttonBgColor} text-white rounded-lg transition-colors font-medium`}
                  >
                    {isServiceable ? "Confirm Status" : "Confirm Repair Status"}
                  </button>
                  <button
                    onClick={handleRepairCancel}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Equipment"
        description="Are you sure you want to delete this equipment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
