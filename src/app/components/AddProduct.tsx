import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { addProduct, getCategories } from "../utils/storage";

export default function AddProduct() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    division: "",
    quantity: "",
    minQuantity: "",
    accountablePerson: "",
    serviceable: "",
    assignedPerson: "",
    description: "",
    notes: "",
  });

  useEffect(() => {
    getCategories().then((cats) => {
      const catNames = cats.map((c) => c.name);
      setCategories(catNames);
      if (catNames.length > 0) {
        setFormData((prev) => ({ ...prev, category: catNames[0] }));
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addProduct({
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        division: formData.division,
        quantity: parseInt(formData.quantity),
        minQuantity: parseInt(formData.minQuantity),
        price: 0,
        accountablePerson: formData.accountablePerson,
        serviceable: formData.serviceable,
        assignedPerson: formData.assignedPerson,
        description: formData.description,
        notes: formData.notes,
      });
      navigate("/products");
    } catch (err) {
      alert("Error adding product: " + (err as Error).message);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="p-8">
      <button
        onClick={() => navigate("/products")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="size-5" />
        Back to Products
      </button>

      <div className="mb-8">
        <h1 className="font-semibold mb-2">Add New Product</h1>
        <p className="text-gray-600">Create a new inventory item</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block mb-2 font-medium text-gray-700">
                P.O Number *
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="sku" className="block mb-2 font-medium text-gray-700">Property Number *</label>
              <input
                id="sku"
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="category" className="block mb-2 font-medium text-gray-700">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700">Assigned Person *</label>
              <input
                type="text"
                name="assignedPerson"
                value={formData.assignedPerson}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700">Division *</label>
              <select
                name="division"
                value={formData.division}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select division</option>
                <option value="PDP">PDP</option>
                <option value="Admin">Admin</option>
                <option value="Motorpool">Motorpool</option>
                <option value="Construction">Construction</option>
                <option value="MQC">MQC</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700">Quantity *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700">Min. Quantity *</label>
              <input
                type="number"
                name="minQuantity"
                value={formData.minQuantity}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700">Accountable Person *</label>
              <input
                type="text"
                name="accountablePerson"
                value={formData.accountablePerson}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700">Serviceable *</label>
              <select
                name="serviceable"
                value={formData.serviceable}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select status</option>
                <option value="Serviceable">Serviceable</option>
                <option value="Under Repair">Under Repair</option>
                <option value="For Repair">For Repair</option>
                <option value="For Disposal/Waste">For Disposal/Waste</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Product
            </button>
            <button
              type="button"
              onClick={() => navigate("/products")}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
