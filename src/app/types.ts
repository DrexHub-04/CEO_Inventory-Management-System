export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  division?: string;
  quantity: number;
  minQuantity: number;
  price: number;
  serviceable?: string;
  accountablePerson?: string;
  assignedPerson: string;
  supplier?: string;
  description: string;
  notes?: string;
  lastUpdated: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export type HistoryAction = "waste" | "transferred" | "repair" | "added" | "delivered" | "returned";

export interface HistoryRecord {
  id: string;
  date: string;
  name?: string;
  poNumber?: string;
  propertyNo?: string;
  action: HistoryAction;
  quantity?: number;
  notes?: string;
  previousAssignedUser?: string;
  newAssignedUser?: string;
  // Legacy fields for backward compatibility
  productId?: string;
  productName?: string;
  sku?: string;
  quantityReturned?: number;
}
