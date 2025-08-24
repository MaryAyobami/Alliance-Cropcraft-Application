import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Eye,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Scale,
  Hash,
  X
} from "lucide-react"

const FarmResources = () => {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState("create") // create, edit, view
  const [selectedResource, setSelectedResource] = useState(null)

  // Role-based permissions
  const canManageResources = ["Admin", "Farm Manager"].includes(user?.role)

  // Mock data for demonstration
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setResources([
        {
          id: 1,
          name: "Chicken Feed",
          category: "Feed",
          current_stock: 45,
          unit: "bags",
          min_threshold: 20,
          max_capacity: 100,
          cost_per_unit: 25.50,
          supplier: "AgriSupply Co.",
          last_updated: "2024-01-15T10:30:00Z",
          expiry_date: "2024-03-15",
          status: "in_stock"
        },
        {
          id: 2,
          name: "Corn Seeds",
          category: "Seeds",
          current_stock: 8,
          unit: "kg",
          min_threshold: 10,
          max_capacity: 50,
          cost_per_unit: 12.00,
          supplier: "SeedPro Ltd.",
          last_updated: "2024-01-10T14:20:00Z",
          expiry_date: "2024-06-30",
          status: "low_stock"
        },
        {
          id: 3,
          name: "Fertilizer NPK",
          category: "Fertilizer",
          current_stock: 0,
          unit: "bags",
          min_threshold: 5,
          max_capacity: 30,
          cost_per_unit: 35.00,
          supplier: "FertMax Solutions",
          last_updated: "2024-01-08T09:15:00Z",
          expiry_date: "2024-12-31",
          status: "out_of_stock"
        },
        {
          id: 4,
          name: "Veterinary Supplies",
          category: "Medical",
          current_stock: 25,
          unit: "units",
          min_threshold: 15,
          max_capacity: 50,
          cost_per_unit: 8.75,
          supplier: "VetCare Supplies",
          last_updated: "2024-01-12T16:45:00Z",
          expiry_date: "2024-08-15",
          status: "in_stock"
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const getStatusColor = (status) => {
    switch (status) {
      case "in_stock":
        return "bg-green-100 text-green-700 border-green-200"
      case "low_stock":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "out_of_stock":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "in_stock":
        return <TrendingUp className="w-4 h-4" />
      case "low_stock":
        return <AlertTriangle className="w-4 h-4" />
      case "out_of_stock":
        return <TrendingDown className="w-4 h-4" />
      default:
        return <Package className="w-4 h-4" />
    }
  }

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !filterCategory || resource.category === filterCategory
    const matchesStatus = !filterStatus || resource.status === filterStatus

    return matchesSearch && matchesCategory && matchesStatus
  })

  const categories = [...new Set(resources.map(r => r.category))]
  const totalValue = resources.reduce((sum, r) => sum + (r.current_stock * r.cost_per_unit), 0)
  const lowStockItems = resources.filter(r => r.status === "low_stock" || r.status === "out_of_stock").length

  const handleCreate = () => {
    if (!canManageResources) return
    setModalMode("create")
    setSelectedResource(null)
    setShowModal(true)
  }

  const handleEdit = (resource) => {
    if (!canManageResources) return
    setModalMode("edit")
    setSelectedResource(resource)
    setShowModal(true)
  }

  const handleView = (resource) => {
    setModalMode("view")
    setSelectedResource(resource)
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Farm Resources & Inventory</h1>
          <p className="text-gray-600 mt-2">Track and manage farm supplies, feed, seeds, and equipment</p>
        </div>
        {canManageResources && (
          <button
            onClick={handleCreate}
            className="mt-4 sm:mt-0 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Resource</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{resources.length}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">${totalValue.toFixed(2)}</p>
            </div>
            <Scale className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-red-600">{lowStockItems}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
            </div>
            <Filter className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Resources</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, category, or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <p className="font-medium">Showing: {filteredResources.length} items</p>
              <p>Value: ${filteredResources.reduce((sum, r) => sum + (r.current_stock * r.cost_per_unit), 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resources Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          {filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
              <p className="text-gray-600">
                {resources.length === 0 ? "Get started by adding your first resource." : "Try adjusting your search criteria."}
              </p>
              {canManageResources && resources.length === 0 && (
                <button
                  onClick={handleCreate}
                  className="mt-4 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl transition-colors"
                >
                  Add First Resource
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map((resource) => (
                <div key={resource.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{resource.name}</h3>
                      <p className="text-sm text-gray-600">{resource.category}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(resource.status)}`}>
                      {getStatusIcon(resource.status)}
                      {resource.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Current Stock:</span>
                      <span className="font-semibold text-gray-900">{resource.current_stock} {resource.unit}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Min Threshold:</span>
                      <span className="text-sm text-gray-700">{resource.min_threshold} {resource.unit}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Unit Cost:</span>
                      <span className="text-sm text-gray-700">${resource.cost_per_unit}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Value:</span>
                      <span className="font-semibold text-gray-900">${(resource.current_stock * resource.cost_per_unit).toFixed(2)}</span>
                    </div>

                    <div className="border-t pt-2">
                      <p className="text-xs text-gray-500">Supplier: {resource.supplier}</p>
                      <p className="text-xs text-gray-500">Updated: {new Date(resource.last_updated).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Stock Level Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Stock Level</span>
                      <span>{Math.round((resource.current_stock / resource.max_capacity) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          resource.current_stock <= resource.min_threshold 
                            ? 'bg-red-500' 
                            : resource.current_stock <= resource.min_threshold * 1.5 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((resource.current_stock / resource.max_capacity) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleView(resource)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                    
                    {canManageResources && (
                      <>
                        <button
                          onClick={() => handleEdit(resource)}
                          className="flex-1 bg-primary-100 hover:bg-primary-200 text-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {/* Handle delete */}}
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resource Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {modalMode === "create" ? "Add New Resource" : 
                 modalMode === "edit" ? "Edit Resource" : "Resource Details"}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {modalMode === "view" && selectedResource ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Resource Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedResource.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedResource.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Stock</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedResource.current_stock} {selectedResource.unit}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(selectedResource.status)}`}>
                      {getStatusIcon(selectedResource.status)}
                      {selectedResource.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedResource.supplier}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cost per Unit</label>
                    <p className="mt-1 text-sm text-gray-900">${selectedResource.cost_per_unit}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedResource.expiry_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Value</label>
                    <p className="mt-1 text-sm text-gray-900">${(selectedResource.current_stock * selectedResource.cost_per_unit).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Resource management form will be implemented with full CRUD operations.</p>
                <p className="text-sm text-gray-500 mt-2">This includes stock tracking, supplier management, and automated alerts for low stock levels.</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FarmResources