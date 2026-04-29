import React, { useEffect, useState } from "react";
import { Edit } from "lucide-react";
import { getProducts, updateProduct } from "../utils/storage";
import { Product } from "../types";

const UNSERVICEABLE_STATUS = ["Under Repair", "For Repair", "For Disposal/Waste"];
const ALL_STATUS = ["Serviceable", ...UNSERVICEABLE_STATUS];

export default function Unserviceable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [repairConfirmDialog, setRepairConfirmDialog] = useState<{
    open: boolean;
    product: Product | null;
    newStatus: string;
  }>({
    open: false,
    product: null,
    newStatus: "",
  });

  const loadProducts = async () => {
    const allProducts = await getProducts();
    setProducts(allProducts);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const updateStatus = async (product: Product, status: string) => {
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
      await loadProducts();
    } catch (err) {
      alert("Unable to update status: " + (err as Error).message);
    }
  };

  const handleRepairConfirm = async () => {
    const { product, newStatus } = repairConfirmDialog;
    if (!product) return;

    try {
      await updateProduct(product.id, { serviceable: newStatus });
      await loadProducts();
      setRepairConfirmDialog({ open: false, product: null, newStatus: "" });
    } catch (err) {
      alert("Unable to update status: " + (err as Error).message);
    }
  };

  const handleRepairCancel = () => {
    setRepairConfirmDialog({ open: false, product: null, newStatus: "" });
  };

  const updateNotes = async (product: Product, notes: string) => {
    try {
      await updateProduct(product.id, { notes });
      await loadProducts();
      setEditingProduct(null);
      setNotesDraft("");
    } catch (err) {
      alert("Unable to update notes: " + (err as Error).message);
    }
  };

  const filtered = products.filter((p) => UNSERVICEABLE_STATUS.includes(p.serviceable ?? ""));
  const searchFiltered = filtered.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.assignedPerson.toLowerCase().includes(q)
    );
  });

  const statusCounts = UNSERVICEABLE_STATUS.reduce<Record<string, number>>((acc, status) => {
    acc[status] = filtered.filter((item) => item.serviceable === status).length;
    return acc;
  }, {});

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-semibold mb-2">Unserviceable Items</h1>
          <p className="text-gray-600">Track items that are not currently usable</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {UNSERVICEABLE_STATUS.map((status) => (
            <div key={status} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">{status}</p>
              <p className="font-semibold text-lg">{statusCounts[status] ?? 0}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Search by name, property no., or assigned person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Item</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Property No.</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Category</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Assigned Person</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Quantity</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Current Status</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Notes</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {searchFiltered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No unserviceable items found
                  </td>
                </tr>
              ) : (
                searchFiltered.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{product.name}</td>
                    <td className="px-6 py-4">{product.sku}</td>
                    <td className="px-6 py-4">{product.category}</td>
                    <td className="px-6 py-4">{product.assignedPerson}</td>
                    <td className="px-6 py-4">{product.quantity}</td>
                    <td className="px-6 py-4">
                      <select
                        value={product.serviceable || ""}
                        onChange={(e) => updateStatus(product, e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded-lg"
                      >
                        {ALL_STATUS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {product.notes ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setNotesDraft(product.notes ?? "");
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit notes"
                      >
                        <Edit className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-gray-600">
        Showing {searchFiltered.length} unserviceable of {filtered.length} items tagged as unserviceable.
      </div>

      {editingProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="font-semibold mb-4">Edit Notes (names, remarks and date)</h3>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="Notes"
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => updateNotes(editingProduct, notesDraft)}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Save
              </button>
            </div>
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
                    <Edit className={`size-6 ${textColor}`} />
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
                            : `You are about to change the status to <strong>"${repairConfirmDialog.newStatus}"</strong>. This indicates the equipment requires repair and may be unavailable for use.`
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
      
    </div>
  );
}
