import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { Package, History, Boxes, XOctagon, ChevronDown, ChevronUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { getProducts, getCategories, getHistory } from "../utils/storage";
import { Product } from "../types";
import { HistoryRecord } from "../types";

function formatHistoryDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([getProducts(), getCategories(), getHistory()]).then(([prods, cats, hist]) => {
      setProducts(prods);
      setCategories(cats.map((c) => c.name));
      setHistoryRecords(hist);
    });
  }, []);

  // Listen for history and product changes made elsewhere (add/update/delete)
  useEffect(() => {
    const historyHandler = async () => {
      const hist = await getHistory();
      setHistoryRecords(hist);
    };

    const productsHandler = async () => {
      const prods = await getProducts();
      setProducts(prods);
    };

    window.addEventListener("inventory_history_changed", historyHandler as EventListener);
    window.addEventListener("products_changed", productsHandler as EventListener);

    return () => {
      window.removeEventListener("inventory_history_changed", historyHandler as EventListener);
      window.removeEventListener("products_changed", productsHandler as EventListener);
    };
  }, []);

  const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);
  const unserviceableCount = products.filter((p) =>
    ["Under Repair", "For Repair", "For Disposal/Waste"].includes(p.serviceable ?? "")
  ).length;

  // Category distribution
  const categoryData = categories.map((cat) => ({
    name: cat,
    count: products.filter((p) => p.category === cat).length,
  }));

  // Stock levels by product (top 8)
  const stockData = products
    .slice(0, 8)
    .map((p) => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + "..." : p.name,
      quantity: p.quantity,
      minQuantity: p.minQuantity,
    }));

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  // Filter products to show only those created/updated today (00:00-23:59)
  const todayProducts = products.filter((product) => {
    const productDate = new Date(product.lastUpdated);
    const now = new Date();
    return (
      productDate.getFullYear() === now.getFullYear() &&
      productDate.getMonth() === now.getMonth() &&
      productDate.getDate() === now.getDate()
    );
  });

  // Filter history records to show only today's activities (00:00-23:59)
  const todayRecords = historyRecords.filter((record) => {
    const recordDate = new Date(record.date);
    const now = new Date();
    return (
      recordDate.getFullYear() === now.getFullYear() &&
      recordDate.getMonth() === now.getMonth() &&
      recordDate.getDate() === now.getDate()
    );
  });

  // Distinguish between added and updated products
  const addedProducts = todayProducts.filter(product =>
    !historyRecords.some(record => record.productId === product.id)
  );

  const updatedProducts = todayProducts.filter(product =>
    historyRecords.some(record => record.productId === product.id)
  );

  // Toggle expanded state for activity items
  const toggleExpanded = (activityId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(activityId)) {
      newExpanded.delete(activityId);
    } else {
      newExpanded.add(activityId);
    }
    setExpandedItems(newExpanded);
  };

  // Merge products and history activities into unified feed with complete details
  const mergedActivities = [
    // Added equipment activities
    ...addedProducts.map((product) => ({
      id: `product-added-${product.id}`,
      type: 'equipment' as const,
      timestamp: new Date(product.lastUpdated),
      productName: product.name,
      sku: product.sku,
      poNumber: product.name, // Using name as PO for equipment
      propertyNumber: product.sku,
      accountablePerson: product.accountablePerson || "Unassigned",
      assignedPerson: product.assignedPerson || "Unassigned",
      action: "Added" as const,
      status: product.serviceable || "Available",
      date: product.lastUpdated,
      displayDate: product.lastUpdated,
      // Additional fields for expansion
      category: product.category,
      quantity: product.quantity,
      minQuantity: product.minQuantity,
      description: product.description,
      notes: product.notes,
      // History-specific fields (null for equipment)
      previousAssignedUser: null,
      newAssignedUser: null,
      quantityReturned: null
    })),
    // Updated equipment activities
    ...updatedProducts.map((product) => ({
      id: `product-updated-${product.id}`,
      type: 'equipment' as const,
      timestamp: new Date(product.lastUpdated),
      productName: product.name,
      sku: product.sku,
      poNumber: product.name, // Using name as PO for equipment
      propertyNumber: product.sku,
      accountablePerson: product.accountablePerson || "Unassigned",
      assignedPerson: product.assignedPerson || "Unassigned",
      action: "Updated" as const,
      status: product.serviceable || "Available",
      date: product.lastUpdated,
      displayDate: product.lastUpdated,
      // Additional fields for expansion
      category: product.category,
      quantity: product.quantity,
      minQuantity: product.minQuantity,
      description: product.description,
      notes: product.notes,
      // History-specific fields (null for equipment)
      previousAssignedUser: null,
      newAssignedUser: null,
      quantityReturned: null
    })),
    // History activities (transfers, repairs, waste)
    ...todayRecords.map((record) => ({
      id: `history-${record.id}`,
      type: 'history' as const,
      timestamp: new Date(record.date),
      productName: record.productName || record.name || "Unknown",
      sku: record.sku || record.propertyNo || "",
      poNumber: record.poNumber || record.productName || "",
      propertyNumber: record.propertyNo || record.sku || "",
      accountablePerson: record.previousAssignedUser || record.name || "Unknown",
      assignedPerson: record.newAssignedUser || "Unknown",
      action: record.action,
      status: record.action, // Use action as status for history
      date: record.date,
      displayDate: record.date,
      // Additional fields for expansion
      category: null,
      quantity: record.quantity,
      minQuantity: null,
      description: null,
      notes: record.notes,
      // History-specific fields
      previousAssignedUser: record.previousAssignedUser,
      newAssignedUser: record.newAssignedUser,
      quantityReturned: record.quantityReturned
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by most recent first

  const stats = [
    {
      label: "Unserviceable",
      value: unserviceableCount,
      icon: XOctagon,
      color: "bg-red-500",
    },
    {
      label: "History Records",
      value: historyRecords.length,
      icon: History,
      color: "bg-green-500",
      link: "/history",
    },
    {
      label: "Total Items",
      value: totalItems,
      icon: Boxes,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-semibold mb-2">Inventory Management Dashboard</h1>
        <p className="text-gray-600">Overview of your inventory</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const content = (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="size-6 text-white" />
                </div>
              </div>
              <p className="text-gray-600 mb-1">{stat.label}</p>
              <p className="font-semibold">{stat.value}</p>
            </div>
          );

          return stat.link ? (
            <Link key={stat.label} to={stat.link}>
              {content}
            </Link>
          ) : (
            <div key={stat.label}>{content}</div>
          );
        })}
      </div>


      {/* Recent Activity (Today's Equipment & History Actions) */}
      {mergedActivities.length > 0 && (
        <div className="mt-6 bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            {mergedActivities.slice(0, 5).map((activity) => {
              const isExpanded = expandedItems.has(activity.id);
              return (
                <div
                  key={activity.id}
                  className={`border rounded-lg ${
                    activity.type === 'equipment' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'
                  }`}
                >
                  {/* Main Activity Row */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h4 className="font-medium text-gray-900">{activity.productName}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            activity.type === 'equipment' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {activity.action}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Property #:</span>
                            <p className="font-medium">{activity.propertyNumber || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">PO #:</span>
                            <p className="font-medium">{activity.poNumber || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Date:</span>
                            <p className="font-medium">{formatHistoryDate(activity.displayDate)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Accountable Person:</span>
                            <p className="font-medium">{activity.accountablePerson}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleExpanded(activity.id)}
                        className={`ml-4 p-2 rounded-full hover:bg-gray-200 transition-colors ${
                          activity.type === 'equipment' ? 'text-blue-600' : 'text-green-600'
                        }`}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-200">
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <p className="font-medium">{activity.status}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Assigned Person:</span>
                          <p className="font-medium">{activity.assignedPerson}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Accountable Person:</span>
                          <p className="font-medium">{activity.accountablePerson}</p>
                        </div>
                        {activity.quantity && (
                          <div>
                            <span className="text-gray-500">Quantity:</span>
                            <p className="font-medium">{activity.quantity}</p>
                          </div>
                        )}
                        {activity.category && (
                          <div>
                            <span className="text-gray-500">Category:</span>
                            <p className="font-medium">{activity.category}</p>
                          </div>
                        )}
                        {activity.previousAssignedUser && (
                          <div>
                            <span className="text-gray-500">Previous User:</span>
                            <p className="font-medium">{activity.previousAssignedUser}</p>
                          </div>
                        )}
                        {activity.newAssignedUser && (
                          <div>
                            <span className="text-gray-500">New User:</span>
                            <p className="font-medium">{activity.newAssignedUser}</p>
                          </div>
                        )}
                        {activity.description && (
                          <div className="md:col-span-2">
                            <span className="text-gray-500">Description:</span>
                            <p className="font-medium">{activity.description}</p>
                          </div>
                        )}
                        {activity.notes && (
                          <div className="md:col-span-2">
                            <span className="text-gray-500">Notes:</span>
                            <p className="font-medium">{activity.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
