import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { weightAPI, livestockAPI } from "../services/api"
import {
  Plus,
  Scale,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
  AlertTriangle,
  X,
  Eye
} from "lucide-react"

const WeightTracking = () => {
  const { user } = useAuth()
  const [livestock, setLivestock] = useState([])
  const [weightRecords, setWeightRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    animal_id: "",
    weight_kg: "",
    date_recorded: new Date().toISOString().split('T')[0],
    body_condition_score: "",
    notes: ""
  })

  // Role-based permissions
  const canRecordWeight = ["Admin", "Farm Manager", "Veterinary Doctor", "Supervisor", "Farm Attendant"].includes(user?.role)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [livestockResponse, weightResponse] = await Promise.all([
        livestockAPI.getLivestock(),
        weightAPI.getWeightRecords()
      ])
      
      setLivestock(livestockResponse.data)
      setWeightRecords(weightResponse.data)
      setError("")
    } catch (error) {
      console.error("Failed to fetch weight data:", error)
      setError("Failed to load weight data. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = (animalId = null) => {
    if (!canRecordWeight) return
    setFormData({
      animal_id: animalId || "",
      weight_kg: "",
      date_recorded: new Date().toISOString().split('T')[0],
      body_condition_score: "",
      notes: ""
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const weightData = {
        ...formData,
        weight_kg: parseFloat(formData.weight_kg),
        body_condition_score: formData.body_condition_score ? parseInt(formData.body_condition_score) : null,
        recorded_by: user.id
      }

      const response = await weightAPI.createWeightRecord(weightData)
      setWeightRecords([response.data, ...weightRecords])
      alert("Weight record added successfully!")
      setShowModal(false)
    } catch (error) {
      console.error("Form submission error:", error)
      alert(error.response?.data?.message || "Failed to save weight record")
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const filteredLivestock = livestock.filter(animal =>
    animal.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    animal.identification_number?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold text-gray-900">Weight Tracking</h1>
          <p className="text-gray-600 mt-2">Monitor animal growth and weight changes</p>
        </div>
        {canRecordWeight && (
          <button
            onClick={() => handleCreate()}
            className="mt-4 sm:mt-0 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Record Weight</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search animals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Animals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLivestock.map((animal) => (
          <div key={animal.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{animal.name}</h3>
                <p className="text-gray-600 capitalize">{animal.species} • {animal.breed}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm">
                <Scale className="w-4 h-4 mr-2 text-gray-400" />
                <span className="font-medium">{animal.weight || 'No weight recorded'}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              {canRecordWeight && (
                <button
                  onClick={() => handleCreate(animal.id)}
                  className="flex-1 bg-primary-100 hover:bg-primary-200 text-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Record Weight</h2>
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
                  Animal <span className="text-red-500">*</span>
                </label>
                <select
                  name="animal_id"
                  value={formData.animal_id}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select animal</option>
                  {livestock.map(animal => (
                    <option key={animal.id} value={animal.id}>
                      {animal.name} ({animal.species})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (kg) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="weight_kg"
                  value={formData.weight_kg}
                  onChange={handleInputChange}
                  required
                  step="0.1"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., 45.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Recorded <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date_recorded"
                  value={formData.date_recorded}
                  onChange={handleInputChange}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Record Weight
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

export default WeightTracking