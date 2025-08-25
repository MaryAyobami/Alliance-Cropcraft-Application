import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { plantingAPI } from "../services/api"
import PlantingForm from "../components/PlantingForm"
import { 
  Sprout, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Eye,
  Calendar,
  MapPin,
  Ruler,
  Droplets,
  Sun,
  Thermometer,
  X,
  CheckCircle,
  Clock
} from "lucide-react"

const PlantingTracker = () => {
  const { user } = useAuth()
  const [plantings, setPlantings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterGrowthStage, setFilterGrowthStage] = useState("")
  const [filterCrop, setFilterCrop] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState("create") // create, edit, view
  const [selectedPlanting, setSelectedPlanting] = useState(null)

  // Role-based permissions
  const canManagePlantings = ["Admin", "Farm Manager"].includes(user?.role)

  useEffect(() => {
    fetchPlantings()
  }, [])

  const fetchPlantings = async () => {
    try {
      setLoading(true)
      const response = await plantingAPI.getPlantings()
      setPlantings(response.data)
      setError("")
    } catch (error) {
      console.error("Failed to fetch plantings:", error)
      setError("Failed to load plantings. Please try again.")
      // Fallback to mock data if API fails
      setPlantings([
        {
          id: 1,
          crop_name: "Corn",
          variety: "Sweet Corn - Golden Bantam",
          location: "North Field A",
          area_planted: 5.2,
          planting_date: "2024-03-15",
          expected_harvest_date: "2024-07-15",
          growth_stage: "flowering",
          status: "active",
          notes: "Growth is excellent, showing early signs of flowering"
        },
        {
          id: 2,
          crop_name: "Tomatoes",
          variety: "Roma Tomatoes",
          location: "Greenhouse B",
          area_planted: 2.1,
          planting_date: "2024-02-20",
          expected_harvest_date: "2024-06-20",
          growth_stage: "fruiting",
          status: "active",
          notes: "Some plants showing signs of blight, treatment applied"
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-700 border-green-200"
      case "needs_attention":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "ready_for_harvest":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "diseased":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getGrowthStageColor = (stage) => {
    switch (stage) {
      case "seedling":
        return "bg-green-50 text-green-600"
      case "vegetative":
        return "bg-blue-50 text-blue-600"
      case "flowering":
        return "bg-purple-50 text-purple-600"
      case "fruiting":
        return "bg-orange-50 text-orange-600"
      case "maturation":
        return "bg-yellow-50 text-yellow-600"
      default:
        return "bg-gray-50 text-gray-600"
    }
  }

  const filteredPlantings = plantings.filter(planting => {
    const matchesSearch = planting.crop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         planting.variety?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         planting.field_location?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesGrowthStage = !filterGrowthStage || planting.growth_stage === filterGrowthStage
    const matchesCrop = !filterCrop || planting.crop_name === filterCrop

    return matchesSearch && matchesGrowthStage && matchesCrop
  })

  const cropTypes = [...new Set(plantings.map(p => p.crop_name))]
  const totalArea = plantings.reduce((sum, p) => sum + p.area_planted, 0)
  const readyForHarvest = plantings.filter(p => p.status === "ready_for_harvest").length

  const handleCreate = () => {
    if (!canManagePlantings) return
    setModalMode("create")
    setSelectedPlanting(null)
    setShowModal(true)
  }

  const handleEdit = (planting) => {
    if (!canManagePlantings) return
    setModalMode("edit")
    setSelectedPlanting(planting)
    setShowModal(true)
  }

  const handleView = (planting) => {
    setModalMode("view")
    setSelectedPlanting(planting)
    setShowModal(true)
  }

  const handlePlantingSaved = (savedPlanting) => {
    if (modalMode === "create") {
      setPlantings([savedPlanting, ...plantings])
    } else if (modalMode === "edit") {
      setPlantings(plantings.map(p => p.id === savedPlanting.id ? savedPlanting : p))
    }
    setShowModal(false)
    setSelectedPlanting(null)
  }

  const handleDelete = async (planting) => {
    if (!canManagePlantings) return
    
    if (window.confirm(`Are you sure you want to delete the "${planting.crop_name}" planting? This action cannot be undone.`)) {
      try {
        await plantingAPI.deletePlanting(planting.id)
        setPlantings(plantings.filter(p => p.id !== planting.id))
      } catch (error) {
        console.error("Failed to delete planting:", error)
        setError("Failed to delete planting. Please try again.")
      }
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Planting Tracker</h1>
          <p className="text-gray-600 mt-2">Track planting activities, growth stages, and harvest planning</p>
        </div>
        {canManagePlantings && (
          <button
            onClick={handleCreate}
            className="mt-4 sm:mt-0 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Planting</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Plantings</p>
              <p className="text-2xl font-bold text-gray-900">{plantings.length}</p>
            </div>
            <Sprout className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Area</p>
              <p className="text-2xl font-bold text-gray-900">{Number(totalArea || 0).toFixed(1)} acres</p>
            </div>
            <Ruler className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ready for Harvest</p>
              <p className="text-2xl font-bold text-green-600">{readyForHarvest}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Crop Varieties</p>
              <p className="text-2xl font-bold text-gray-900">{cropTypes.length}</p>
            </div>
            <Filter className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Plantings</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by crop, variety, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Crop</label>
            <select
              value={filterCrop}
              onChange={(e) => setFilterCrop(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Crops</option>
              {cropTypes.map(crop => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Growth Stage</label>
            <select
              value={filterGrowthStage}
              onChange={(e) => setFilterGrowthStage(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Growth Stages</option>
              <option value="seedling">Seedling</option>
              <option value="vegetative">Vegetative</option>
              <option value="flowering">Flowering</option>
              <option value="fruiting">Fruiting</option>
              <option value="maturation">Maturation</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <p className="font-medium">Showing: {filteredPlantings.length} plantings</p>
              <p>  Area: {Number(filteredPlantings.reduce((sum, p) => sum + (Number(p.area_planted) || 0), 0)).toFixed(1)} acres</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plantings Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          {filteredPlantings.length === 0 ? (
            <div className="text-center py-12">
              <Sprout className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No plantings found</h3>
              <p className="text-gray-600">
                {plantings.length === 0 ? "Get started by recording your first planting." : "Try adjusting your search criteria."}
              </p>
              {canManagePlantings && plantings.length === 0 && (
                <button
                  onClick={handleCreate}
                  className="mt-4 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl transition-colors"
                >
                  Record First Planting
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlantings.map((planting) => (
                <div key={planting.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{planting.crop_name}</h3>
                      <p className="text-sm text-gray-600">{planting.variety}</p>
                    </div>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(planting.status)}`}>
                      {planting.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{planting.field_location}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Ruler className="w-4 h-4" />
                      <span>{planting.area_planted} acres</span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Planted: {new Date(planting.planting_date).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Harvest: {planting.expected_harvest_date ? new Date(planting.expected_harvest_date).toLocaleDateString() : 'Not set'}</span>
                    </div>

                    <div className="border-t pt-2">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getGrowthStageColor(planting.growth_stage)}`}>
                        {planting.growth_stage.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {planting.notes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 italic">"{planting.notes}"</p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleView(planting)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                    
                    {canManagePlantings && (
                      <>
                        <button
                          onClick={() => handleEdit(planting)}
                          className="flex-1 bg-primary-100 hover:bg-primary-200 text-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Update</span>
                        </button>
                        <button
                          onClick={() => handleDelete(planting)}
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

      {/* Planting Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {modalMode === "create" ? "Record New Planting" : 
                 modalMode === "edit" ? "Update Planting" : "Planting Details"}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {modalMode === "view" && selectedPlanting ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Crop Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlanting.crop_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Variety</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlanting.variety || "Not specified"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlanting.location || "Not specified"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Area Planted</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlanting.area_planted} hectares</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Growth Stage</label>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getGrowthStageColor(selectedPlanting.growth_stage)}`}>
                      {selectedPlanting.growth_stage.charAt(0).toUpperCase() + selectedPlanting.growth_stage.slice(1)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Growth Stage</label>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getGrowthStageColor(selectedPlanting.growth_stage)}`}>
                      {selectedPlanting.growth_stage.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Spacing</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlanting.spacing}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Planting Depth</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlanting.depth}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Irrigation Schedule</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlanting.irrigation_schedule}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fertilizer</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlanting.fertilizer_applied}</p>
                  </div>
                </div>
                
                {selectedPlanting.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedPlanting.notes}</p>
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
            ) : (
              <PlantingForm
                planting={selectedPlanting}
                mode={modalMode}
                onPlantingSaved={handlePlantingSaved}
                onCancel={() => setShowModal(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PlantingTracker