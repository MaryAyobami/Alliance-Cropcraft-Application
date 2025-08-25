import { useState, useEffect } from "react"
import { farmResourcesAPI, externalUsersAPI } from "../services/api"

const FarmResourceForm = ({ resource: editResource, mode, onResourceSaved, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    current_stock: "",
    unit: "",
    min_threshold: "",
    max_capacity: "",
    cost_per_unit: "",
    supplier: "",
    expiry_date: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [suppliers, setSuppliers] = useState([])

  // Available categories
  const categories = [
    "Feed",
    "Seeds",
    "Fertilizer",
    "Medical",
    "Equipment",
    "Tools",
    "Chemicals",
    "Other"
  ]

  // Available units
  const units = [
    "bags",
    "kg",
    "liters",
    "units",
    "boxes",
    "tons",
    "pieces",
    "bottles"
  ]

  useEffect(() => {
    fetchSuppliers()
  }, [])

  useEffect(() => {
    if (editResource && mode === "edit") {
      setFormData({
        name: editResource.name || "",
        category: editResource.category || "",
        current_stock: editResource.current_stock?.toString() || "",
        unit: editResource.unit || "",
        min_threshold: editResource.min_threshold?.toString() || "",
        max_capacity: editResource.max_capacity?.toString() || "",
        cost_per_unit: editResource.cost_per_unit?.toString() || "",
        supplier: editResource.supplier || "",
        expiry_date: editResource.expiry_date ? editResource.expiry_date.split('T')[0] : ""
      })
    }
  }, [editResource, mode])

  const fetchSuppliers = async () => {
    try {
      const response = await externalUsersAPI.getSuppliers()
      setSuppliers(response.data)
    } catch (error) {
      console.error("Failed to fetch suppliers:", error)
      // Fallback to empty array if fetch fails
      setSuppliers([])
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.name.trim()) {
      errors.name = "Resource name is required"
    }

    if (!formData.category) {
      errors.category = "Category is required"
    }

    if (!formData.current_stock || isNaN(formData.current_stock) || Number(formData.current_stock) < 0) {
      errors.current_stock = "Valid current stock is required"
    }

    if (!formData.unit.trim()) {
      errors.unit = "Unit is required"
    }

    if (formData.min_threshold && (isNaN(formData.min_threshold) || Number(formData.min_threshold) < 0)) {
      errors.min_threshold = "Min threshold must be a valid number"
    }

    if (formData.max_capacity && (isNaN(formData.max_capacity) || Number(formData.max_capacity) < 0)) {
      errors.max_capacity = "Max capacity must be a valid number"
    }

    if (formData.cost_per_unit && (isNaN(formData.cost_per_unit) || Number(formData.cost_per_unit) < 0)) {
      errors.cost_per_unit = "Cost per unit must be a valid number"
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: "" })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
      const submitData = {
        name: formData.name.trim(),
        category: formData.category,
        current_stock: Number(formData.current_stock),
        unit: formData.unit.trim(),
        min_threshold: formData.min_threshold ? Number(formData.min_threshold) : 0,
        max_capacity: formData.max_capacity ? Number(formData.max_capacity) : 0,
        cost_per_unit: formData.cost_per_unit ? Number(formData.cost_per_unit) : 0,
        supplier: formData.supplier.trim(),
        expiry_date: formData.expiry_date || null
      }

      let response
      if (mode === "create") {
        response = await farmResourcesAPI.createResource(submitData)
      } else {
        response = await farmResourcesAPI.updateResource(editResource.id, submitData)
      }

      if (onResourceSaved) {
        onResourceSaved(response.data)
      }
    } catch (err) {
      console.error("Resource save error:", err)
      const errorData = err.response?.data
      
      if (errorData?.field) {
        setFieldErrors({ [errorData.field]: errorData.message })
      } else if (errorData?.message) {
        setError(errorData.message)
      } else {
        setError(mode === "create" ? "Failed to create resource" : "Failed to update resource")
      }
    } finally {
      setLoading(false)
    }
  }

  const getFieldClassName = (fieldName) => {
    const baseClass = "w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 transition-colors"
    if (fieldErrors[fieldName]) {
      return `${baseClass} border-red-500 focus:ring-red-200`
    }
    return `${baseClass} border-gray-300 focus:ring-primary-200 focus:border-primary-500`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resource Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={getFieldClassName('name')}
            placeholder="Enter resource name"
          />
          {fieldErrors.name && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={getFieldClassName('category')}
          >
            <option value="">Select category</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          {fieldErrors.category && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.category}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Stock <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="current_stock"
            value={formData.current_stock}
            onChange={handleChange}
            className={getFieldClassName('current_stock')}
            placeholder="Enter current stock"
            min="0"
            step="0.01"
          />
          {fieldErrors.current_stock && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.current_stock}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit <span className="text-red-500">*</span>
          </label>
          <select
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className={getFieldClassName('unit')}
          >
            <option value="">Select unit</option>
            {units.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
          {fieldErrors.unit && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.unit}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Min Threshold</label>
          <input
            type="number"
            name="min_threshold"
            value={formData.min_threshold}
            onChange={handleChange}
            className={getFieldClassName('min_threshold')}
            placeholder="Minimum stock level"
            min="0"
            step="0.01"
          />
          {fieldErrors.min_threshold && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.min_threshold}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
          <input
            type="number"
            name="max_capacity"
            value={formData.max_capacity}
            onChange={handleChange}
            className={getFieldClassName('max_capacity')}
            placeholder="Maximum storage capacity"
            min="0"
            step="0.01"
          />
          {fieldErrors.max_capacity && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.max_capacity}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit (₦)</label>
          <input
            type="number"
            name="cost_per_unit"
            value={formData.cost_per_unit}
            onChange={handleChange}
            className={getFieldClassName('cost_per_unit')}
            placeholder="Cost in Naira"
            min="0"
            step="0.01"
          />
          {fieldErrors.cost_per_unit && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.cost_per_unit}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
          <select
            name="supplier"
            value={formData.supplier}
            onChange={handleChange}
            className={getFieldClassName('supplier')}
          >
            <option value="">Select supplier</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.company_name || supplier.full_name}>
                {supplier.company_name || supplier.full_name}
                {supplier.specialization && ` - ${supplier.specialization}`}
                {supplier.rating > 0 && ` (${supplier.rating}★)`}
              </option>
            ))}
          </select>
          {fieldErrors.supplier && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.supplier}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
          <input
            type="date"
            name="expiry_date"
            value={formData.expiry_date}
            onChange={handleChange}
            className={getFieldClassName('expiry_date')}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {mode === "create" ? "Creating..." : "Updating..."}
            </span>
          ) : (
            mode === "create" ? "Create Resource" : "Update Resource"
          )}
        </button>
      </div>
    </form>
  )
}

export default FarmResourceForm