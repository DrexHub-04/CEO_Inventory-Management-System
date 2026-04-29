import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  History as HistoryIcon,
  Package,
  Trash2,
  ArrowRightLeft,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import {
  getHistory,
  deleteHistoryRecord,
  updateHistoryRecord,
} from "../utils/storage";
import { HistoryRecord } from "../types";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import ExportHistory from "./ExportHistory";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionLabel(action: HistoryRecord["action"]) {
  switch (action) {
    case "waste":
      return {
        label: "Waste",
        icon: Trash2,
        className: "bg-amber-100 text-amber-800",
      };
    case "transferred":
      return {
        label: "Transferred",
        icon: ArrowRightLeft,
        className: "bg-blue-100 text-blue-800",
      };
    case "repair":
      return {
        label: "Repair",
        icon: Pencil,
        className: "bg-orange-100 text-orange-800",
      };
    case "delivered":
      return {
        label: "Delivered",
        icon: Package,
        className: "bg-purple-100 text-purple-800",
      };
    case "added":
      return {
        label: "Added",
        icon: Plus,
        className: "bg-green-100 text-green-800",
      };
    case "returned":
      return {
        label: "Returned",
        icon: ArrowRightLeft,
        className: "bg-green-100 text-green-800",
      };
    default:
      return {
        label: action,
        icon: Trash2,
        className: "bg-gray-100 text-gray-800",
      };
  }
}

export default function History() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [editingRecord, setEditingRecord] =
    useState<HistoryRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRecords = records.filter((record) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;

    const dateText = formatDate(record.date).toLowerCase();
    const previousUser = (record.previousAssignedUser ?? "").toLowerCase();
    const newUser = (record.newAssignedUser ?? record.name ?? "").toLowerCase();
    const poNumber = (record.poNumber ?? record.productName ?? "").toLowerCase();
    const propertyNo = (record.propertyNo ?? record.sku ?? "").toLowerCase();

    return (
      dateText.includes(query) ||
      previousUser.includes(query) ||
      newUser.includes(query) ||
      poNumber.includes(query) ||
      propertyNo.includes(query)
    );
  });

  const transferredRecords = filteredRecords.filter((r) => r.action === "transferred");
  const wasteRecords = filteredRecords.filter((r) => r.action === "waste");
  const repairRecords = filteredRecords.filter((r) => r.action === "repair");

  useEffect(() => {
    // history now only includes waste/transferred/repair entries
    getHistory().then((hist) =>
      setRecords(hist.filter((r) => r.action === "waste" || r.action === "transferred" || r.action === "repair"))
    );
  }, []);

  const handleDeleteClick = (id: string) => {
    setRecordToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    try {
      await deleteHistoryRecord(recordToDelete);
      const updated = await getHistory();
      setRecords(updated);
    } catch (err) {
      alert("Error deleting record: " + (err as Error).message);
    }
    setRecordToDelete(null);
  };

  function handleEdit(record: HistoryRecord) {
    setEditingRecord(record);
  }

  async function handleSaveEdit() {
    if (!editingRecord) return;
    try {
      await updateHistoryRecord(editingRecord);
      const updated = await getHistory();
      setRecords(updated);
      setEditingRecord(null);
    } catch (err) {
      alert("Error updating record: " + (err as Error).message);
    }
  }

  const renderTable = (tableRecords: HistoryRecord[], title: string, icon: React.ReactNode) => (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-gray-600">{icon}</div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <span className="ml-auto px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
          {tableRecords.length} item{tableRecords.length !== 1 ? "s" : ""}
        </span>
      </div>

      {tableRecords.length === 0 ? (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No {title.toLowerCase()} records yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Date</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Previous User</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">New User</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">P.O Number</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Property No.</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Quantity</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Notes</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {tableRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {record.previousAssignedUser ? record.previousAssignedUser : "Unassigned"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {record.newAssignedUser ?? record.name ?? "—"}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {record.poNumber ?? record.productName ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {record.propertyNo ?? record.sku ?? "—"}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {record.quantity ?? record.quantityReturned ?? 0}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {record.notes ?? "—"}
                    </td>

                    {/* ACTION BUTTONS */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Pencil className="size-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteClick(record.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-semibold mb-2 text-xl">History</h1>
          <p className="text-gray-600">
            Track all equipment transactions and activities
          </p>
        </div>
        <ExportHistory />
      </div>

      <div className="mb-6">
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by date, previous user, new user, PO number, property number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <HistoryIcon className="size-16 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No history yet</h3>
          <p className="text-gray-600 mb-4">
            When you record an item as Waste or Transferred from the Equipment page, it will appear here.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Package className="size-5" />
            Go to Equipment
          </Link>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <HistoryIcon className="size-16 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No matching records</h3>
          <p className="text-gray-600 mb-4">
            Try entering different keywords or clear the search box.
          </p>
        </div>
      ) : (
        <>
          {renderTable(transferredRecords, "Transferred Items", <ArrowRightLeft className="size-5 text-blue-600" />)}
          {renderTable(repairRecords, "Repaired Items", <Pencil className="size-5 text-orange-600" />)}
          {renderTable(wasteRecords, "Waste Items", <Trash2 className="size-5 text-amber-600" />)}

          <div className="mt-4 text-gray-600">
            Showing {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""}
          </div>
        </>
      )}

      {/* EDIT MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="font-semibold mb-4">Edit Notes (names, remarks and date)</h3>

            <input
              type="text"
              value={editingRecord.notes ?? ""}
              onChange={(e) =>
                setEditingRecord({
                  ...editingRecord,
                  notes: e.target.value,
                })
              }
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="Notes"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Record"
        description="Are you sure you want to delete this record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
