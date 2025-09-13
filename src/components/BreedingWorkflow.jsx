import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { breedingAPI, livestockAPI } from "../services/api"
import { queueAPICall, getCachedData, cacheData } from "../services/offlineSync"
import {
  Plus,
  Heart,
  Calendar,
  Search,
  Filter,
  Baby,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  Users
} from "lucide-react"

const BreedingWorkflow = () => {
  const { user } = useAuth()
  const [livestock, setLivestock] = useState([])
  const [breedingEvents, setBreedingEvents] = useState([])
  const [pregnancyChecks, setPregnancyChecks] = useState([])
  const [births, setBirths] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState("service") // service, check, birth, view
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [formData, setFormData] = useState({
    female_id: "",
    male_id: "",
    breeding_method: "natural",
    service_date: new Date().toISOString().split('T')[0],
    notes: ""
  })
  const [checkData, setCheckData] = useState({
    breeding_event_id: "",
    female_id: "",
    check_date: new Date().toISOString().split('T')[0],
    result: "",
    method: "palpation",
    notes: ""
  })
  const [birthData, setBirthData] = useState({
    breeding_event_id: "",
    dam_id: "",
    sire_id: "",
    birth_date: new Date().toISOString().split('T')[0],
    birth_weight: "",
    offspring_count: "1",
    complications: "",
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
      
      if (navigator.onLine) {
        try {
          const [
            livestockResponse,
            eventsResponse,
            checksResponse,
            birthsResponse
          ] = await Promise.all([
            livestockAPI.getLivestock(),
            breedingAPI.getBreedingEvents(),
            breedingAPI.getPregnancyChecks(),
            breedingAPI.getBirths()
          ])
          
          setLivestock(livestockResponse.data)
          setBreedingEvents(eventsResponse.data)
          setPregnancyChecks(checksResponse.data)
          setBirths(birthsResponse.data)
          
          // Cache for offline use
          await cacheData.livestock(livestockResponse.data)
          
        } catch (apiError) {
          throw apiError
        }
      } else {
        throw new Error('Offline mode')
      }

      setError("")
    } catch (error) {
      console.error("Failed to fetch breeding data:", error)
      
      // Load from cache
      try {
        const cachedLivestock = await getCachedData.livestock()
        setLivestock(cachedLivestock || [])
        setError("Using offline data. Some information may be outdated.")
      } catch (cacheError) {
        setError("Failed to load breeding data. Please check your connection.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleServiceRecord = () => {
    if (!canManageBreeding) return
    setModalMode("service")
    setSelectedEvent(null)
    setFormData({
      female_id: "",
      male_id: "",
      breeding_method: "natural",
      service_date: new Date().toISOString().split('T')[0],
      notes: ""
    })
    setShowModal(true)
  }

  const handlePregnancyCheck = (event = null) => {
    if (!canManageBreeding) return
    setModalMode("check")
    setSelectedEvent(event)
    setCheckData({
      breeding_event_id: event?.id || "",
      female_id: event?.female_id || "",
      check_date: new Date().toISOString().split('T')[0],
      result: "",
      method: "palpation",
      notes: ""
    })
    setShowModal(true)
  }

  const handleBirthRecord = (event = null) => {
    if (!canManageBreeding) return
    setModalMode("birth")
    setSelectedEvent(event)
    setBirthData({
      breeding_event_id: event?.id || "",
      dam_id: event?.female_id || "",
      sire_id: event?.male_id || "",
      birth_date: new Date().toISOString().split('T')[0],
      birth_weight: "",
      offspring_count: "1",
      complications: "",
      notes: ""
    })
    setShowModal(true)
  }

  const handleView = (event) => {
    setModalMode("view")
    setSelectedEvent(event)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      if (modalMode === "service") {
        const serviceData = {
          ...formData,
          recorded_by: user.id
        }

        if (navigator.onLine) {
          const response = await breedingAPI.createBreedingEvent(serviceData)
          setBreedingEvents([response.data, ...breedingEvents])
        } else {
          await queueAPICall('/breeding-events', 'POST', serviceData, 'high')
          // Add optimistically to UI
          const tempEvent = { 
            ...serviceData, 
            id: `temp_${Date.now()}`,
            expected_due_date: calculateDueDate(serviceData.service_date, getAnimalSpecies(serviceData.female_id))
          }
          setBreedingEvents([tempEvent, ...breedingEvents])
        }
        
        alert("Breeding service recorded successfully!")
      } else if (modalMode === "check") {
        const pregnancyData = {
          ...checkData,
          checked_by: user.id
        }

        if (navigator.onLine) {
          const response = await breedingAPI.createPregnancyCheck(pregnancyData)
          setPregnancyChecks([response.data, ...pregnancyChecks])
        } else {
          await queueAPICall('/pregnancy-checks', 'POST', pregnancyData, 'high')
          const tempCheck = { ...pregnancyData, id: `temp_${Date.now()}` }
          setPregnancyChecks([tempCheck, ...pregnancyChecks])
        }
        
        alert("Pregnancy check recorded successfully!")
      } else if (modalMode === "birth") {
        const birthRecordData = {
          ...birthData,
          birth_weight: birthData.birth_weight ? parseFloat(birthData.birth_weight) : null,
          offspring_count: parseInt(birthData.offspring_count),
          assisted_by: user.id
        }

        if (navigator.onLine) {
          const response = await breedingAPI.createBirth(birthRecordData)
          setBirths([response.data, ...births])
        } else {
          await queueAPICall('/births', 'POST', birthRecordData, 'high')
          const tempBirth = { ...birthRecordData, id: `temp_${Date.now()}` }
          setBirths([tempBirth, ...births])
        }
        
        alert("Birth recorded successfully!")
      }
      
      setShowModal(false)
    } catch (error) {
      console.error("Form submission error:", error)
      alert(error.response?.data?.message || "Failed to save breeding record")
    }
  }

  // Helper functions
  const calculateDueDate = (serviceDate, species) => {
    const gestationPeriods = {
      cattle: 280,
      goat: 150,
      sheep: 147,
      pig: 114
    }
    
    const days = gestationPeriods[species] || 150
    const dueDate = new Date(serviceDate)
    dueDate.setDate(dueDate.getDate() + days)
    return dueDate.toISOString().split('T')[0]
  }

  const getAnimalSpecies = (animalId) => {
    const animal = livestock.find(a => a.id.toString() === animalId.toString())
    return animal?.species || 'goat'
  }

  const getAnimalName = (animalId) => {
    const animal = livestock.find(a => a.id.toString() === animalId.toString())
    return animal?.name || 'Unknown'
  }

  const getBreedingStatus = (event) => {
    const check = pregnancyChecks.find(c => c.breeding_event_id === event.id)
    const birth = births.find(b => b.breeding_event_id === event.id)
    
    if (birth) return { status: 'completed', label: 'Birth Recorded', color: 'bg-green-100 text-green-800' }
    if (check?.result === 'pregnant') return { status: 'pregnant', label: 'Confirmed Pregnant', color: 'bg-blue-100 text-blue-800' }
    if (check?.result === 'not_pregnant') return { status: 'failed', label: 'Not Pregnant', color: 'bg-red-100 text-red-800' }
    if (check?.result === 'uncertain') return { status: 'uncertain', label: 'Uncertain', color: 'bg-yellow-100 text-yellow-800' }
    
    // Check if due for pregnancy check (21+ days after service)
    const daysSinceService = Math.floor((Date.now() - new Date(event.service_date)) / (1000 * 60 * 60 * 24))
    if (daysSinceService >= 21) return { status: 'check_due', label: 'Check Due', color: 'bg-orange-100 text-orange-800' }
    
    return { status: 'waiting', label: 'Waiting', color: 'bg-gray-100 text-gray-800' }
  }

  const getUpcomingDueDates = () => {
    const upcoming = []
    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)

    breedingEvents.forEach(event => {
      const check = pregnancyChecks.find(c => c.breeding_event_id === event.id && c.result === 'pregnant')
      if (check && event.expected_due_date) {
        const dueDate = new Date(event.expected_due_date)
        if (dueDate >= today && dueDate <= nextWeek) {
          upcoming.push({
            ...event,
            female_name: getAnimalName(event.female_id),
            due_date: event.expected_due_date
          })
        }
      }
    })

    return upcoming.sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
  }

  const filteredEvents = breedingEvents.filter(event => {
    const femaleName = getAnimalName(event.female_id)
    const maleName = getAnimalName(event.male_id)
    const status = getBreedingStatus(event)
    
    const matchesSearch = femaleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         maleName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || status.status === filterStatus
    
    return matchesSearch && matchesStatus
  })

  const getFemaleAnimals = () => livestock.filter(animal => animal.gender === 'female' && animal.species)
  const getMaleAnimals = (species) => livestock.filter(animal => 
    animal.gender === 'male' && 
    animal.species === species
  )

  const upcomingBirths = getUpcomingDueDates()

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

      {/* Upcoming Births Alert */}
      {upcomingBirths.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
            <Baby className="w-5 h-5 mr-2" />
            Upcoming Births ({upcomingBirths.length})
          </h3>
          <div className="space-y-2">
            {upcomingBirths.map((event) => (
              <div key={event.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{event.female_name}</p>
                  <p className="text-sm text-gray-600">Due: {new Date(event.due_date).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => handleBirthRecord(event)}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  Record Birth
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by animal name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Status</option>
              <option value="waiting">Waiting</option>
              <option value="check_due">Check Due</option>
              <option value="pregnant">Confirmed Pregnant</option>
              <option value="completed">Birth Recorded</option>
              <option value="failed">Not Pregnant</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-end">
            <div className="text-sm text-gray-600">
              <p className="font-medium">Total Events: {filteredEvents.length}</p>
              <p>Upcoming Births: {upcomingBirths.length}</p>
            </div>
          </div>
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
              <p className="text-gray-600 mb-4">
                {breedingEvents.length === 0 ? "Start by recording your first breeding service" : "Try adjusting your search criteria"}
              </p>
              {canManageBreeding && breedingEvents.length === 0 && (
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
                const status = getBreedingStatus(event)
                const femaleName = getAnimalName(event.female_id)
                const maleName = getAnimalName(event.male_id)
                
                return (
                  <div key={event.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{femaleName} × {maleName}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
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
                          
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            <span className="capitalize">{event.breeding_method}</span>
                          </div>
                        </div>

                        {event.notes && (
                          <p className="text-sm text-gray-600 mb-3">{event.notes}</p>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleView(event)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                        
                        {canManageBreeding && status.status === 'check_due' && (
                          <button
                            onClick={() => handlePregnancyCheck(event)}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Check Pregnancy
                          </button>
                        )}
                        
                        {canManageBreeding && status.status === 'pregnant' && (
                          <button
                            onClick={() => handleBirthRecord(event)}
                            className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Record Birth
                          </button>
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
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {modalMode === "service" && "Record Breeding Service"}
                {modalMode === "check" && "Pregnancy Check"}
                {modalMode === "birth" && "Record Birth"}
                {modalMode === "view" && "Breeding Event Details"}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {modalMode === "view" ? (
              // View mode
              <div className="space-y-4">
                {selectedEvent && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Female</label>
                        <p className="mt-1 text-sm text-gray-900">{getAnimalName(selectedEvent.female_id)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Male</label>
                        <p className="mt-1 text-sm text-gray-900">{getAnimalName(selectedEvent.male_id)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Service Date</label>
                        <p className="mt-1 text-sm text-gray-900">{new Date(selectedEvent.service_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Method</label>
                        <p className="mt-1 text-sm text-gray-900 capitalize">{selectedEvent.breeding_method}</p>
                      </div>
                      {selectedEvent.expected_due_date && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Expected Due Date</label>
                          <p className="mt-1 text-sm text-gray-900">{new Date(selectedEvent.expected_due_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                    
                    {selectedEvent.notes && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedEvent.notes}</p>
                      </div>
                    )}

                    {/* Show related pregnancy checks and births */}
                    <div className="border-t pt-4">
                      <h3 className="font-medium text-gray-900 mb-2">Related Records</h3>
                      
                      {pregnancyChecks.filter(c => c.breeding_event_id === selectedEvent.id).map(check => (
                        <div key={check.id} className="bg-gray-50 p-3 rounded-lg mb-2">
                          <p className="text-sm font-medium">Pregnancy Check - {new Date(check.check_date).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-600 capitalize">Result: {check.result}</p>
                          {check.notes && <p className="text-sm text-gray-600">{check.notes}</p>}
                        </div>
                      ))}

                      {births.filter(b => b.breeding_event_id === selectedEvent.id).map(birth => (
                        <div key={birth.id} className="bg-green-50 p-3 rounded-lg mb-2">
                          <p className="text-sm font-medium">Birth - {new Date(birth.birth_date).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-600">Offspring: {birth.offspring_count}</p>
                          {birth.birth_weight && <p className="text-sm text-gray-600">Birth Weight: {birth.birth_weight}kg</p>}
                          {birth.notes && <p className="text-sm text-gray-600">{birth.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Form modes
              <form onSubmit={handleSubmit} className="space-y-4">
                {modalMode === "service" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Breeding Method <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="breeding_method"
                          value={formData.breeding_method}
                          onChange={(e) => setFormData({ ...formData, breeding_method: e.target.value })}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="natural">Natural Mating</option>
                          <option value="artificial_insemination">Artificial Insemination</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Additional notes about the breeding service"
                      />
                    </div>
                  </>
                )}

                {modalMode === "check" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Female</label>
                      <p className="text-gray-900">{getAnimalName(checkData.female_id)}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Check Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={checkData.check_date}
                          onChange={(e) => setCheckData({ ...checkData, check_date: e.target.value })}
                          required
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Result <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={checkData.result}
                          onChange={(e) => setCheckData({ ...checkData, result: e.target.value })}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Select result</option>
                          <option value="pregnant">Pregnant</option>
                          <option value="not_pregnant">Not Pregnant</option>
                          <option value="uncertain">Uncertain</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Check Method</label>
                      <select
                        value={checkData.method}
                        onChange={(e) => setCheckData({ ...checkData, method: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="palpation">Palpation</option>
                        <option value="ultrasound">Ultrasound</option>
                        <option value="visual">Visual Observation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={checkData.notes}
                        onChange={(e) => setCheckData({ ...checkData, notes: e.target.value })}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Additional observations"
                      />
                    </div>
                  </>
                )}

                {modalMode === "birth" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mother (Dam)</label>
                        <p className="text-gray-900">{getAnimalName(birthData.dam_id)}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Father (Sire)</label>
                        <p className="text-gray-900">{getAnimalName(birthData.sire_id)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Birth Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={birthData.birth_date}
                          onChange={(e) => setBirthData({ ...birthData, birth_date: e.target.value })}
                          required
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of Offspring <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={birthData.offspring_count}
                          onChange={(e) => setBirthData({ ...birthData, offspring_count: e.target.value })}
                          required
                          min="1"
                          max="10"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Birth Weight (kg)</label>
                        <input
                          type="number"
                          value={birthData.birth_weight}
                          onChange={(e) => setBirthData({ ...birthData, birth_weight: e.target.value })}
                          step="0.1"
                          min="0"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Total weight"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Complications</label>
                      <textarea
                        value={birthData.complications}
                        onChange={(e) => setBirthData({ ...birthData, complications: e.target.value })}
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Any complications during birth"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={birthData.notes}
                        onChange={(e) => setBirthData({ ...birthData, notes: e.target.value })}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Additional notes about the birth"
                      />
                    </div>
                  </>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {modalMode === "service" ? "Record Service" : 
                     modalMode === "check" ? "Save Check" : "Record Birth"}
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
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default BreedingWorkflow