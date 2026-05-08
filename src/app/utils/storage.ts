import { Product, Category, HistoryRecord } from "../types";
import { clearAuth } from "./auth";

const getApiBase = (): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://ceo-inventory-management-system.onrender.com";
  return `${baseUrl}/api`;
};

// Get token from localStorage
const getToken = (): string => {
  return localStorage.getItem("inventory_auth_token") || "";
};

// Get authorization header
const getAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : "",
  };
};

// Get headers for FormData requests (no Content-Type)
const getAuthHeadersForFormData = (): Record<string, string> => {
  const token = getToken();
  return {
    "Authorization": token ? `Bearer ${token}` : "",
  };
};

// Get headers for download requests (no Content-Type header)
const getAuthHeadersForDownload = (): Record<string, string> => {
  const token = getToken();
  return {
    "Authorization": token ? `Bearer ${token}` : "",
  };
};

// Handle auth errors - redirect to login if token is invalid/expired
const handleAuthError = (res: Response) => {
  if (res.status === 401 || res.status === 403) {
    const errorMsg = res.status === 401 ? "Token expired" : "Invalid token";
    console.error(`[auth] ${errorMsg}, logging out...`);
    clearAuth();
    // Redirect to login
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }
  return res;
};

// Helper function to transform MongoDB _id to id
const transformMongoId = <T extends { _id: string }>(obj: T): Omit<T, '_id'> & { id: string } => {
  const { _id, ...rest } = obj;
  return { ...rest, id: _id };
};

// ========== PRODUCTS ==========
export const getProducts = async (): Promise<Product[]> => {
  try {
    const res = await fetch(`${getApiBase()}/products`, {
      headers: getAuthHeaders(),
    });
    await handleAuthError(res);
    if (!res.ok) throw new Error("Failed to fetch products");
    const products = await res.json();
    return products.map((product: any) => ({
      ...transformMongoId(product),
      assignedPerson: product.assignedPerson ?? product.supplier ?? "",
      supplier: product.supplier,
      division: product.division,
    })) as Product[];
  } catch (err) {
    console.error("Error fetching products:", err);
    return [];
  }
};

export const saveProducts = async (products: Product[]): Promise<void> => {
  // Not used with backend, but kept for compatibility
};

export const getProduct = async (id: string): Promise<Product | undefined> => {
  try {
    const res = await fetch(`${getApiBase()}/products/${id}`, {
      headers: getAuthHeaders(),
    });
    await handleAuthError(res);
    if (!res.ok) return undefined;
    const product = await res.json();
    return {
      ...transformMongoId(product),
      assignedPerson: product.assignedPerson ?? product.supplier ?? "",
      supplier: product.supplier,
      division: product.division,
    } as Product;
  } catch (err) {
    console.error("Error fetching product:", err);
    return undefined;
  }
};

export const addProduct = async (product: Omit<Product, "id" | "lastUpdated">): Promise<Product> => {
  try {
    const formData = new FormData();
    formData.append("name", product.name);
    formData.append("sku", product.sku);
    formData.append("category", product.category);
    formData.append("quantity", product.quantity.toString());
    formData.append("minQuantity", product.minQuantity.toString());
    formData.append("price", product.price.toString());
    formData.append("supplier", product.assignedPerson);
    formData.append("description", product.description);
    formData.append("serviceable", product.serviceable || "");
    formData.append("accountablePerson", product.accountablePerson || "");
    formData.append("division", product.division || "");
    formData.append("notes", product.notes || "");


    const res = await fetch(`${getApiBase()}/products`, {
      method: "POST",
      headers: getAuthHeadersForFormData(),
      body: formData,
    });

    await handleAuthError(res);
    if (!res.ok) throw new Error("Failed to add product");
    const newProduct = await res.json();
    dispatchEvent("products_changed");
    return transformMongoId(newProduct) as Product;
  } catch (err) {
    console.error("Error adding product:", err);
    throw err;
  }
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
  try {
    const formData = new FormData();
    (Object.keys(updates) as Array<keyof Product>).forEach((key) => {
      let value = updates[key];
      if (value !== undefined && key !== "id" && key !== "lastUpdated") {
        const formKey = key === "assignedPerson" ? "supplier" : key;
        formData.append(formKey, String(value));
      }
    });

    const res = await fetch(`${getApiBase()}/products/${id}`, {
      method: "PUT",
      headers: getAuthHeadersForFormData(),
      body: formData,
    });

    await handleAuthError(res);
    if (!res.ok) throw new Error("Failed to update product");
    dispatchEvent("products_changed");
  } catch (err) {
    console.error("Error updating product:", err);
    throw err;
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const res = await fetch(`${getApiBase()}/products/${id}`, { 
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    await handleAuthError(res);
    if (!res.ok) throw new Error("Failed to delete product");
    dispatchEvent("products_changed");
  } catch (err) {
    console.error("Error deleting product:", err);
    throw err;
  }
};

// ========== CATEGORIES ==========
export const getCategories = async (): Promise<Category[]> => {
  try {
    const res = await fetch(`${getApiBase()}/categories`, {
      headers: getAuthHeaders(),
    });
    await handleAuthError(res);
    if (!res.ok) throw new Error("Failed to fetch categories");
    const categories = await res.json();
    return categories.map(transformMongoId) as Category[];
  } catch (err) {
    console.error("Error fetching categories:", err);
    return [];
  }
};

export const saveCategories = async (categories: Category[]): Promise<void> => {
  // Not used with backend
};

export const addCategory = async (category: Omit<Category, "id">): Promise<Category> => {
  try {
    const res = await fetch(`${getApiBase()}/categories`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(category),
    });
    await handleAuthError(res);
    if (!res.ok) throw new Error("Failed to add category");
    const newCategory = await res.json();
    return transformMongoId(newCategory) as Category;
  } catch (err) {
    console.error("Error adding category:", err);
    throw err;
  }
};

export const updateCategory = async (id: string, updates: Partial<Category>): Promise<void> => {
  try {
    const res = await fetch(`${getApiBase()}/categories/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    await handleAuthError(res);
    if (!res.ok) throw new Error("Failed to update category");
  } catch (err) {
    console.error("Error updating category:", err);
    throw err;
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    const res = await fetch(`${getApiBase()}/categories/${id}`, { 
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    await handleAuthError(res);
    if (!res.ok) throw new Error("Failed to delete category");
  } catch (err) {
    console.error("Error deleting category:", err);
    throw err;
  }
};

// ========== HISTORY ==========
export const getHistory = async (): Promise<HistoryRecord[]> => {
  try {
    const res = await fetch(`${getApiBase()}/history`, {
      headers: getAuthHeaders(),
    });
    await handleAuthError(res);
    if (!res.ok) throw new Error("Failed to fetch history");
    const history = await res.json();
    return history.map(transformMongoId) as HistoryRecord[];
  } catch (err) {
    console.error("Error fetching history:", err);
    return [];
  }
};

const dispatchEvent = (eventName: string) => {
  try {
    window.dispatchEvent(new CustomEvent(eventName));
  } catch (e) {
    // ignore
  }
};

export const addHistoryRecord = async (record: Omit<HistoryRecord, "id" | "date">): Promise<HistoryRecord> => {
  try {
    const payload = {
      // New general equipment history fields
      name: record.name,
      poNumber: record.poNumber,
      propertyNo: record.propertyNo,
      action: record.action,
      quantity: record.quantity,
      notes: record.notes,

      // Legacy fields for backward compatibility
      productId: record.productId,
      productName: record.productName,
      sku: record.sku,
      quantityReturned: record.quantityReturned,
      previousAssignedUser: record.previousAssignedUser,
      newAssignedUser: record.newAssignedUser
    };
    
    if (record.action === 'transferred') {
      console.log("[addHistoryRecord] Sending transfer payload:", {
        previousAssignedUser: payload.previousAssignedUser,
        newAssignedUser: payload.newAssignedUser,
        productName: payload.productName
      });
    }
    
    const res = await fetch(`${getApiBase()}/history`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    await handleAuthError(res);
    if (!res.ok) throw new Error("Failed to add history record");
    const newRecord = await res.json();
    dispatchEvent("inventory_history_changed");
    return transformMongoId(newRecord) as HistoryRecord;
  } catch (err) {
    console.error("Error adding history record:", err);
    throw err;
  }
};

export function deleteHistoryRecord(id: string) {
  return fetch(`${getApiBase()}/history/${id}`, { 
    method: "DELETE",
    headers: getAuthHeaders(),
  })
    .then(async (res) => {
      await handleAuthError(res);
      if (!res.ok) throw new Error("Failed to delete history record");
      dispatchEvent("inventory_history_changed");
      return res.json();
    })
    .catch((err) => {
      console.error("Error deleting history record:", err);
      throw err;
    });
}

export function updateHistoryRecord(updatedRecord: HistoryRecord) {
  return fetch(`${getApiBase()}/history/${updatedRecord.id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      // New general equipment history fields
      name: updatedRecord.name,
      poNumber: updatedRecord.poNumber,
      propertyNo: updatedRecord.propertyNo,
      action: updatedRecord.action,
      quantity: updatedRecord.quantity,
      notes: updatedRecord.notes,

      // Legacy fields for backward compatibility
      productId: updatedRecord.productId,
      productName: updatedRecord.productName,
      sku: updatedRecord.sku,
      quantityReturned: updatedRecord.quantityReturned
    }),
  })
    .then(async (res) => {
      await handleAuthError(res);
      if (!res.ok) throw new Error("Failed to update history record");
      dispatchEvent("inventory_history_changed");
      return res.json();
    })
    .catch((err) => {
      console.error("Error updating history record:", err);
      throw err;
    });
}

// `returned` entries are no longer tracked by history; this helper was
// removed to avoid accidental use. If you need to record other actions,
// use `recordWasteOrTransfer` or `addHistoryRecord` directly.

// export const recordReturn = async (
//   productId: string,
//   productName: string,
//   sku: string,
//   quantityReturned: number,
//   notes?: string
// ): Promise<void> => {
//   // removed in favor of simplifying history actions
//};

export const recordWasteOrTransfer = async (
  productId: string,
  productName: string,
  sku: string,
  quantity: number,
  action: "waste" | "transferred" | "repair",
  name?: string,
  notes?: string,
  currentAssignedUser?: string
): Promise<void> => {
  try {
    console.log("[transfer] Function called with:", { currentAssignedUser, name, action });
    
    const product = await getProduct(productId);
    console.log("[transfer] Fetched product:", { assignedPerson: product?.assignedPerson, currentAssignedUser });
    
    if (product) {
      // Capture previous assigned user BEFORE any updates
      // Use currentAssignedUser if provided, otherwise fetch from product
      // Use assignedPerson (current user with equipment) instead of accountablePerson (owner)
      const previousAssignedUser = currentAssignedUser ?? product.assignedPerson ?? "";
      console.log("[transfer] Calculated previousAssignedUser:", { currentAssignedUser, productAssigned: product.assignedPerson, previousAssignedUser });
      
      if (action === "transferred" && name && name.trim()) {
        // For transfer, update assignedPerson to the new user
        // accountablePerson (owner) remains unchanged
        await updateProduct(productId, { assignedPerson: name.trim() });
      } else if (action === "waste") {
        // For waste, delete the product record from Equipment entirely
        await deleteProduct(productId);
      } else if (action === "repair" && name && name.trim()) {
        // For repair, update assignedPerson to the person handling repair
        // accountablePerson (owner) remains unchanged
        await updateProduct(productId, { assignedPerson: name.trim(), serviceable: "Under Repair" });
      }

      // Add to history with properly captured values
      const historyData = {
        productId,
        productName,
        sku,
        action,
        quantityReturned: quantity,
        name,
        notes,
        previousAssignedUser: action === "transferred" ? previousAssignedUser : undefined,
        newAssignedUser: action === "transferred" ? name : undefined,
      };
      console.log("[transfer] Sending to history:", historyData);
      await addHistoryRecord(historyData);
    }
  } catch (err) {
    console.error("Error recording waste/transfer/repair:", err);
    throw err;
  }
};

// ========== GENERAL EQUIPMENT HISTORY ==========
export const addEquipmentHistory = async (record: Omit<HistoryRecord, "id" | "date">): Promise<HistoryRecord> => {
  return addHistoryRecord(record);
};

// ========== EXPORT ==========
export const exportEquipmentToExcel = async (): Promise<void> => {
  try {
    const res = await fetch(`${getApiBase()}/products/export/excel`, {
      method: "GET",
      headers: getAuthHeadersForDownload(),
    });

    // Handle auth errors
    if (res.status === 401 || res.status === 403) {
      const errorMsg = res.status === 401 ? "Token expired" : "Invalid token";
      console.error(`[auth] ${errorMsg}, logging out...`);
      clearAuth();
      window.location.href = "/login";
      throw new Error("Session expired. Please log in again.");
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[export] Export failed with status ${res.status}:`, errorText);
      throw new Error(`Failed to export equipment data (Status: ${res.status})`);
    }

    // Get the blob data
    const blob = await res.blob();
    
    if (blob.size === 0) {
      throw new Error("Export returned empty file");
    }

    // Create a download link and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Equipment_Inventory_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log("[export] Equipment exported successfully");
  } catch (err) {
    console.error("Error exporting equipment to Excel:", err);
    throw err;
  }
};

// ========== EXPORT HISTORY ==========
export const exportHistoryToExcel = async (): Promise<void> => {
  try {
    const res = await fetch(`${getApiBase()}/history/export/excel`, {
      method: "GET",
      headers: getAuthHeadersForDownload(),
    });

    // Handle auth errors
    if (res.status === 401 || res.status === 403) {
      const errorMsg = res.status === 401 ? "Token expired" : "Invalid token";
      console.error(`[auth] ${errorMsg}, logging out...`);
      clearAuth();
      window.location.href = "/login";
      throw new Error("Session expired. Please log in again.");
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[export] Export failed with status ${res.status}:`, errorText);
      throw new Error(`Failed to export history data (Status: ${res.status})`);
    }

    // Get the blob data
    const blob = await res.blob();
    
    if (blob.size === 0) {
      throw new Error("Export returned empty file");
    }

    // Create a download link and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `History_Records_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log("[export] History exported successfully");
  } catch (err) {
    console.error("Error exporting history to Excel:", err);
    throw err;
  }
};
