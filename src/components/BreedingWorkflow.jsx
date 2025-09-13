import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { breedingAPI, livestockAPI } from "../services/api"
import {
  Plus,
  Heart,
  Calendar,
  Search,
  Baby,
  Eye,
  AlertTriangle,
  X,
  Users
} from "lucide-react"

const BreedingWorkflow = () => {
  const { user } = useAuth()
  const [livestock, setLivestock] = useState([])
  const [breedingEvents, setBreedingEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState("service")
  const [formData, setFormData] = useState({
    female_id: "",
    male_id: "",
    breeding_method: "natural",
    service_date: new Date().toISOString().split('T')[0],
    notes: ""
  })

  // Role-based permissions
  const canManageBreeding = ["Admin", "Farm Manager", "Veterinary Doctor", "Supervisor"].includes(user?.role)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [livestockResponse, eventsResponse] = await Promise.all([
        livestockAPI.getLivestock(),
        breedingAPI.getBreedingEvents()
      ])
      
      setLivestock(livestockResponse.data)
      setBreedingEvents(eventsResponse.data)
      setError("")
    } catch (error) {
      console.error("Failed to fetch breeding data:", error)
      setError("Failed to load breeding data. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const handleServiceRecord = () => {
    if (!canManageBreeding) return
    setModalMode("service")
    setFormData({
      female_id: "",
      male_id: "",
      breeding_method: "natural",
      service_date: new Date().toISOString().split('T')[0],
      notes: ""
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const serviceData = {
        ...formData,
        recorded_by: user.id
      }

      const response = await breedingAPI.createBreedingEvent(serviceData)
      setBreedingEvents([response.data, ...breedingEvents])
      alert("Breeding service recorded successfully!")
      setShowModal(false)
    } catch (error) {
      console.error("Form submission error:", error)
      alert(error.response?.data?.message || "Failed to save breeding record")
    }
  }

  const getAnimalName = (animalId) => {
    const animal = livestock.find(a => a.id.toString() === animalId.toString())
    return animal?.name || 'Unknown'
  }

  const getFemaleAnimals = () => livestock.filter(animal => animal.gender === 'female')
  const getMaleAnimals = (species) => livestock.filter(animal => 
    animal.gender === 'male' && animal.species === species
  )

  const getAnimalSpecies = (animalId) => {
    const animal = livestock.find(a => a.id.toString() === animalId.toString())
    return animal?.species || 'goat'
  }

  const filteredEvents = breedingEvents.filter(event => {
    const femaleName = getAnimalName(event.female_id)
    const maleName = getAnimalName(event.male_id)
    return femaleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           maleName.toLowerCase().includes(searchTerm.toLowerCase())
  })

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
          <h1 className="text-3xl font-bold text-gray-900">Breeding Management</h1>
          <p className="text-gray-600 mt-2">Track breeding services, pregnancy checks, and births</p>
        </div>
        {canManageBreeding && (
          <button
            onClick={handleServiceRecord}
            className="mt-4 sm:mt-0 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Record Service</span>
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
            placeholder="Search breeding events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Breeding Events */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Breeding Events</h2>
          <p className="text-gray-600 mt-1">Recent breeding activities and their status</p>
        </div>

        <div className="p-6">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No breeding events found</h3>
              <p className="text-gray-600 mb-4">Start by recording your first breeding service</p>
              {canManageBreeding && (
                <button
                  onClick={handleServiceRecord}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl transition-colors"
                >
                  Record First Service
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => {
                const femaleName = getAnimalName(event.female_id)
                const maleName = getAnimalName(event.male_id)
                
                return (
                  <div key={event.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">{femaleName} × {maleName}</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>Service: {new Date(event.service_date).toLocaleDateString()}</span>
                          </div>
                          
                          {event.expected_due_date && (
                            <div className="flex items-center">
                              <Baby className="w-4 h-4 mr-2" />
                              <span>Due: {new Date(event.expected_due_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {event.notes && (
                          <p className="text-sm text-gray-600 mt-2">{event.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Record Breeding Service</h2>
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
                  Female <span className="text-red-500">*</span>
                </label>
                <select
                  name="female_id"
                  value={formData.female_id}
                  onChange={(e) => setFormData({ ...formData, female_id: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select female animal</option>
                  {getFemaleAnimals().map(animal => (
                    <option key={animal.id} value={animal.id}>
                      {animal.name} ({animal.species})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Male <span className="text-red-500">*</span>
                </label>
                <select
                  name="male_id"
                  value={formData.male_id}
                  onChange={(e) => setFormData({ ...formData, male_id: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select male animal</option>
                  {getMaleAnimals(getAnimalSpecies(formData.female_id)).map(animal => (
                    <option key={animal.id} value={animal.id}>
                      {animal.name} ({animal.species})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="service_date"
                  value={formData.service_date}
                  onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
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
                  Record Service
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

export default BreedingWorkflow