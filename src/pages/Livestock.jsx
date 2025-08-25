import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { livestockAPI } from "../services/api"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Eye,
  AlertTriangle,
  Heart,
  MapPin,
  Calendar,
  Hash,
  Scale,
  Activity,
  Shield,
  TrendingUp,
  X
} from "lucide-react"

const Livestock = () => {
  const { user } = useAuth()
  const [livestock, setLivestock] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterSpecies, setFilterSpecies] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState("create") // create, edit, view
  const [selectedLivestock, setSelectedLivestock] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    species: "",
    breed: "",
    age: "",
    weight: "",
    gender: "",
    health_status: "healthy",
    location: "",
    acquisition_date: "",
    identification_number: "",
    vaccination_records: [],
    medical_history: [],
    feeding_schedule: "",
    notes: ""
  })
  const [formError, setFormError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})

  // Role-based permissions
  const canCreate = ["Admin", "Farm Manager"].includes(user?.role)
  const canUpdate = ["Admin", "Farm Manager", "Veterinary Doctor"].includes(user?.role)
  const canDelete = ["Admin", "Farm Manager"].includes(user?.role)

  useEffect(() => {
    fetchLivestock()
  }, [])

  const fetchLivestock = async () => {
    try {
      setLoading(true)
      const response = await livestockAPI.getLivestock()
      setLivestock(response.data)
      setError("")
    } catch (error) {
      console.error("Failed to fetch livestock:", error)
      setError("Failed to load livestock data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setModalMode("create")
    setSelectedLivestock(null)
    setFormData({
      name: "",
      species: "",
      breed: "",
      age: "",
      weight: "",
      gender: "",
      health_status: "healthy",
      location: "",
      acquisition_date: "",
      identification_number: "",
      vaccination_records: [],
      medical_history: [],
      feeding_schedule: "",
      notes: ""
    })
    setFormError("")
    setFieldErrors({})
    setShowModal(true)
  }

  const handleEdit = (animal) => {
    setModalMode("edit")
    setSelectedLivestock(animal)
    setFormData({
      name: animal.name || "",
      species: animal.species || "",
      breed: animal.breed || "",
      age: animal.age || "",
      weight: animal.weight || "",
      gender: animal.gender || "",
      health_status: animal.health_status || "healthy",
      location: animal.location || "",
      acquisition_date: animal.acquisition_date || "",
      identification_number: animal.identification_number || "",
      vaccination_records: animal.vaccination_records || [],
      medical_history: animal.medical_history || [],
      feeding_schedule: animal.feeding_schedule || "",
      notes: animal.notes || ""
    })
    setFormError("")
    setFieldErrors({})
    setShowModal(true)
  }

  const handleView = (animal) => {
    setModalMode("view")
    setSelectedLivestock(animal)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this livestock record?")) {
      return
    }

    try {
      await livestockAPI.deleteLivestock(id)
      setLivestock(livestock.filter(animal => animal.id !== id))
      alert("Livestock record deleted successfully")
    } catch (error) {
      console.error("Failed to delete livestock:", error)
      alert(error.response?.data?.message || "Failed to delete livestock record")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError("")
    setFieldErrors({})

    try {
      let response
      if (modalMode === "create") {
        response = await livestockAPI.createLivestock(formData)
        setLivestock([response.data.livestock, ...livestock])
        alert("Livestock record created successfully!")
      } else if (modalMode === "edit") {
        response = await livestockAPI.updateLivestock(selectedLivestock.id, formData)
        setLivestock(livestock.map(animal => 
          animal.id === selectedLivestock.id ? response.data.livestock : animal
        ))
        alert("Livestock record updated successfully!")
      }
      setShowModal(false)
    } catch (error) {
      console.error("Form submission error:", error)
      const errorData = error.response?.data
      
      if (errorData?.field) {
        setFieldErrors({ [errorData.field]: errorData.message })
        setFormError("Please check the highlighted field")
      } else {
        setFormError(errorData?.message || "Failed to save livestock record")
      }
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: "" })
    }
  }

  // Filter livestock based on search and filters
  const filteredLivestock = livestock.filter(animal => {
    const matchesSearch = animal.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         animal.species?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         animal.identification_number?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = !filterStatus || animal.health_status === filterStatus
    const matchesSpecies = !filterSpecies || animal.species?.toLowerCase() === filterSpecies.toLowerCase()
    
    return matchesSearch && matchesStatus && matchesSpecies
  })

  // Calculate stats for dashboard boxes
  const totalAnimals = livestock.length
  const healthyAnimals = livestock.filter(animal => animal.health_status === 'healthy').length
  const sickAnimals = livestock.filter(animal => animal.health_status === 'sick').length
  const criticalAnimals = livestock.filter(animal => animal.health_status === 'critical').length
  const quarantinedAnimals = livestock.filter(animal => animal.health_status === 'quarantine').length

  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800'
      case 'sick': return 'bg-red-100 text-red-800'
      case 'quarantine': return 'bg-yellow-100 text-yellow-800'
      case 'deceased': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFieldClassName = (fieldName) => {
    const baseClass = "w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors"
    if (fieldErrors[fieldName]) {
      return `${baseClass} border-red-500 focus:ring-red-200`
    }
    return `${baseClass} border-gray-300 focus:ring-primary-200 focus:border-primary-500`
  }

  if (loading) {
    return (
      <div className="min-h-screen farm-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Livestock Management</h1>
          <p className="text-gray-600 mt-2">Manage and monitor your farm animals</p>
        </div>
        {canCreate && (
          <button
            onClick={handleCreate}
            className="mt-4 sm:mt-0 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Livestock</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Animals</p>
                <p className="text-2xl font-bold text-gray-900">{totalAnimals}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Healthy</p>
                <p className="text-2xl font-bold text-green-600">{healthyAnimals}</p>
              </div>
              <Heart className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sick</p>
                <p className="text-2xl font-bold text-red-600">{sickAnimals}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Needs Attention</p>
                <p className="text-2xl font-bold text-orange-600">{criticalAnimals + quarantinedAnimals}</p>
              </div>
              <Shield className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Animals</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, species, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Species</label>
            <select
              value={filterSpecies}
              onChange={(e) => setFilterSpecies(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Species</option>
              {[...new Set(livestock.map(animal => animal.species).filter(Boolean))].map(species => (
                <option key={species} value={species}>{species}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Health Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="sick">Sick</option>
              <option value="quarantine">Quarantine</option>
              <option value="deceased">Deceased</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <p className="font-medium">Showing: {filteredLivestock.length} animals</p>
              <p>Total animals: {livestock.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Livestock Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {filteredLivestock.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No livestock found</h3>
            <p className="text-gray-600 mb-4">
              {livestock.length === 0 ? "Get started by adding your first animal" : "Try adjusting your search criteria"}
            </p>
            {canCreate && livestock.length === 0 && (
              <button
                onClick={handleCreate}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl transition-colors"
              >
                Add Your First Animal
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLivestock.map((animal) => (
              <div key={animal.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{animal.name}</h3>
                    <p className="text-gray-600">{animal.species} {animal.breed && `• ${animal.breed}`}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthStatusColor(animal.health_status)}`}>
                    {animal.health_status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {animal.identification_number && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Hash className="w-4 h-4 mr-2" />
                      <span>{animal.identification_number}</span>
                    </div>
                  )}
                  
                  {animal.age && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{animal.age} years old</span>
                    </div>
                  )}
                  
                  {animal.weight && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Scale className="w-4 h-4 mr-2" />
                      <span>{animal.weight} kg</span>
                    </div>
                  )}
                  
                  {animal.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{animal.location}</span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleView(animal)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                  
                  {canUpdate && (
                    <button
                      onClick={() => handleEdit(animal)}
                      className="flex-1 bg-primary-100 hover:bg-primary-200 text-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  )}
                  
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(animal.id)}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">
                    {modalMode === "create" && "Add New Livestock"}
                    {modalMode === "edit" && "Edit Livestock"}
                    {modalMode === "view" && "Livestock Details"}
                  </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
                </div>

                {modalMode === "view" ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <p className="text-gray-900">{selectedLivestock?.name || "N/A"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Species</label>
                        <p className="text-gray-900">{selectedLivestock?.species || "N/A"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
                        <p className="text-gray-900">{selectedLivestock?.breed || "N/A"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <p className="text-gray-900">{selectedLivestock?.gender || "N/A"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                        <p className="text-gray-900">{selectedLivestock?.age ? `${selectedLivestock.age} years` : "N/A"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                        <p className="text-gray-900">{selectedLivestock?.weight ? `${selectedLivestock.weight} kg` : "N/A"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Health Status</label>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthStatusColor(selectedLivestock?.health_status)}`}>
                          {selectedLivestock?.health_status || "N/A"}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <p className="text-gray-900">{selectedLivestock?.location || "N/A"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Identification Number</label>
                        <p className="text-gray-900">{selectedLivestock?.identification_number || "N/A"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Date</label>
                        <p className="text-gray-900">{selectedLivestock?.acquisition_date || "N/A"}</p>
                      </div>
                    </div>
                    
                    {selectedLivestock?.feeding_schedule && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Feeding Schedule</label>
                        <p className="text-gray-900">{selectedLivestock.feeding_schedule}</p>
                      </div>
                    )}
                    
                    {selectedLivestock?.notes && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <p className="text-gray-900">{selectedLivestock.notes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {formError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className={getFieldClassName('name')}
                          placeholder="Enter animal name"
                        />
                        {fieldErrors.name && (
                          <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Species <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="species"
                          value={formData.species}
                          onChange={handleInputChange}
                          className={getFieldClassName('species')}
                          placeholder="e.g., Cattle, Sheep, Goat"
                        />
                        {fieldErrors.species && (
                          <p className="text-red-500 text-xs mt-1">{fieldErrors.species}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
                        <input
                          type="text"
                          name="breed"
                          value={formData.breed}
                          onChange={handleInputChange}
                          className={getFieldClassName('breed')}
                          placeholder="Enter breed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleInputChange}
                          className={getFieldClassName('gender')}
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age (years)</label>
                        <input
                          type="number"
                          name="age"
                          value={formData.age}
                          onChange={handleInputChange}
                          min="0"
                          max="50"
                          className={getFieldClassName('age')}
                          placeholder="Enter age"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                        <input
                          type="number"
                          name="weight"
                          value={formData.weight}
                          onChange={handleInputChange}
                          min="0"
                          step="0.1"
                          className={getFieldClassName('weight')}
                          placeholder="Enter weight"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Health Status</label>
                        <select
                          name="health_status"
                          value={formData.health_status}
                          onChange={handleInputChange}
                          className={getFieldClassName('health_status')}
                        >
                          <option value="healthy">Healthy</option>
                          <option value="sick">Sick</option>
                          <option value="quarantine">Quarantine</option>
                          <option value="deceased">Deceased</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          className={getFieldClassName('location')}
                          placeholder="Enter location"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Date</label>
                        <input
                          type="date"
                          name="acquisition_date"
                          value={formData.acquisition_date}
                          onChange={handleInputChange}
                          max={new Date().toISOString().split('T')[0]}
                          className={getFieldClassName('acquisition_date')}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Identification Number</label>
                        <input
                          type="text"
                          name="identification_number"
                          value={formData.identification_number}
                          onChange={handleInputChange}
                          className={getFieldClassName('identification_number')}
                          placeholder="Enter ID number"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Feeding Schedule</label>
                      <textarea
                        name="feeding_schedule"
                        value={formData.feeding_schedule}
                        onChange={handleInputChange}
                        rows={3}
                        className={getFieldClassName('feeding_schedule')}
                        placeholder="Enter feeding schedule details"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={3}
                        className={getFieldClassName('notes')}
                        placeholder="Additional notes or observations"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 btn-primary"
                      >
                        {modalMode === "create" ? "Create Livestock" : "Update Livestock"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Livestock