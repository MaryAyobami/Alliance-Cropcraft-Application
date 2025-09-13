import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { penAPI } from "../services/api"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  MapPin,
  Hash,
  AlertCircle,
  Settings,
  X,
  UserCheck
} from "lucide-react"

const PenManagement = () => {
  const { user } = useAuth()
  const [pens, setPens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState("create")
  const [formData, setFormData] = useState({
    name: "",
    capacity: "",
    species: "",
    location: "",
    notes: ""
  })

  // Role-based permissions
  const canManagePens = ["Admin", "Farm Manager", "Supervisor"].includes(user?.role)

  useEffect(() => {
    fetchPens()
  }, [])

  const fetchPens = async () => {
    try {
      setLoading(true)
      const response = await penAPI.getPens()
      setPens(response.data)
      setError("")
    } catch (error) {
      console.error("Failed to fetch pens:", error)
      setError("Failed to load pen data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    if (!canManagePens) return
    setModalMode("create")
    setFormData({
      name: "",
      capacity: "",
      species: "",
      location: "",
      notes: ""
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      if (modalMode === "create") {
        const response = await penAPI.createPen(formData)
        setPens([response.data, ...pens])
        alert("Pen created successfully!")
      }
      
      setShowModal(false)
    } catch (error) {
      console.error("Form submission error:", error)
      alert(error.response?.data?.message || "Failed to save pen")
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const filteredPens = pens.filter(pen => 
    pen.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pen.location?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 className="text-3xl font-bold text-gray-900">Pen Management</h1>
          <p className="text-gray-600 mt-2">Manage livestock pens and staff assignments</p>
        </div>
        {canManagePens && (
          <button
            onClick={handleCreate}
            className="mt-4 sm:mt-0 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Pen</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search pens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Pens Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPens.map((pen) => (
          <div key={pen.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{pen.name}</h3>
                <p className="text-gray-600 capitalize">{pen.species}</p>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {pen.current_occupancy || 0}/{pen.capacity || 0}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {pen.location && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{pen.location}</span>
                </div>
              )}
              
              <div className="flex items-center text-sm text-gray-600">
                <Hash className="w-4 h-4 mr-2" />
                <span>Capacity: {pen.capacity || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPens.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pens found</h3>
          <p className="text-gray-600 mb-4">
            {pens.length === 0 ? "Get started by creating your first pen" : "Try adjusting your search criteria"}
          </p>
          {canManagePens && pens.length === 0 && (
            <button
              onClick={handleCreate}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl transition-colors"
            >
              Create Your First Pen
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Add New Pen</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pen Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Pen A1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Species <span className="text-red-500">*</span>
                </label>
                <select
                  name="species"
                  value={formData.species}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select species</option>
                  <option value="cattle">Cattle</option>
                  <option value="goat">Goat</option>
                  <option value="sheep">Sheep</option>
                  <option value="pig">Pig</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Maximum number of animals"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., North Pasture"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Create Pen
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PenManagement