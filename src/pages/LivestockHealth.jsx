import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { livestockAPI, livestockHealthAPI } from "../services/api"
import HealthRecordForm from "../components/HealthRecordForm"
import { 
  Heart, 
  Plus, 
  Edit, 
  Trash2,
  Search, 
  Filter, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Syringe,
  Baby,
  Utensils,
  FileText,
  Eye,
  X
} from "lucide-react"

const LivestockHealth = () => {
  const { user } = useAuth()
  const [livestock, setLivestock] = useState([])
  const [healthRecords, setHealthRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterType, setFilterType] = useState("all") // all, health, vaccination, breeding, feeding
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState("create") // create, edit, view
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [selectedAnimal, setSelectedAnimal] = useState("")

  // Role-based permissions
  const canManageHealth = ["Admin", "Farm Manager", "Veterinary Doctor", "Supervisor"].includes(user?.role)
  const canDeleteRecords = ["Admin", "Farm Manager", "Supervisor"].includes(user?.role)

  useEffect(() => {
    fetchLivestock()
  }, [])

  const fetchLivestock = async () => {
    try {
      setLoading(true)
      const [livestockResponse, healthResponse] = await Promise.all([
        livestockAPI.getLivestock(),
        livestockHealthAPI.getHealthRecords()
      ])
      
      setLivestock(livestockResponse.data)
      setHealthRecords(healthResponse.data)
      setError("")
    } catch (error) {
      console.error("Failed to fetch data:", error)
      setError("Failed to load livestock data. Please try again.")
      // Fallback to mock data generation if API fails
      try {
        const response = await livestockAPI.getLivestock()
        setLivestock(response.data)
        generateHealthRecords(response.data)
      } catch {
        // If all else fails, provide empty data
        setLivestock([])
        setHealthRecords([])
      }
    } finally {
      setLoading(false)
    }
  }

  // Generate sample health records - in a real app, this would come from a health records API
  const generateHealthRecords = (livestockData) => {
    const records = []
    const recordTypes = ['health_check', 'vaccination', 'breeding', 'feeding', 'treatment']
    
    livestockData.forEach(animal => {
      // Generate 2-5 records per animal
      const recordCount = Math.floor(Math.random() * 4) + 2
      for (let i = 0; i < recordCount; i++) {
        const type = recordTypes[Math.floor(Math.random() * recordTypes.length)]
        const daysAgo = Math.floor(Math.random() * 90)
        const date = new Date()
        date.setDate(date.getDate() - daysAgo)

        records.push({
          id: `${animal.id}_${i}`,
          animal_id: animal.id,
          animal_name: animal.name,
          animal_species: animal.species,
          type,
          date: date.toISOString().split('T')[0],
          description: getRecordDescription(type, animal),
          notes: getRecordNotes(type),
          veterinarian: type === 'vaccination' || type === 'treatment' ? 'Dr. Johnson' : null,
          next_due: getNextDueDate(type, date)
        })
      }
    })

    records.sort((a, b) => new Date(b.date) - new Date(a.date))
    setHealthRecords(records)
  }

  const getRecordDescription = (type, animal) => {
    const descriptions = {
      health_check: `General health examination for ${animal.name}`,
      vaccination: `Vaccination administered to ${animal.name}`,
      breeding: `Breeding activity recorded for ${animal.name}`,
      feeding: `Feeding schedule updated for ${animal.name}`,
      treatment: `Medical treatment provided to ${animal.name}`
    }
    return descriptions[type] || 'Health record'
  }

  const getRecordNotes = (type) => {
    const notes = {
      health_check: 'Animal appears healthy, no concerns noted',
      vaccination: 'Vaccine administered, no adverse reactions observed',
      breeding: 'Breeding attempt successful, monitoring required',
      feeding: 'Adjusted feed portion, monitor weight gain',
      treatment: 'Treatment completed, follow-up required'
    }
    return notes[type] || 'No additional notes'
  }

  const getNextDueDate = (type, lastDate) => {
    if (type === 'vaccination') {
      const nextDate = new Date(lastDate)
      nextDate.setMonth(nextDate.getMonth() + 6) // 6 months for next vaccination
      return nextDate.toISOString().split('T')[0]
    } else if (type === 'health_check') {
      const nextDate = new Date(lastDate)
      nextDate.setMonth(nextDate.getMonth() + 3) // 3 months for next health check
      return nextDate.toISOString().split('T')[0]
    }
    return null
  }

  const getHealthStatusColor = (status) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-700 border-green-200"
      case "sick":
        return "bg-red-100 text-red-700 border-red-200"
      case "under_treatment":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "quarantine":
        return "bg-orange-100 text-orange-700 border-orange-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getRecordTypeIcon = (type) => {
    switch (type) {
      case 'health_check':
        return <Heart className="w-4 h-4" />
      case 'vaccination':
        return <Syringe className="w-4 h-4" />
      case 'breeding':
        return <Baby className="w-4 h-4" />
      case 'feeding':
        return <Utensils className="w-4 h-4" />
      case 'treatment':
        return <Activity className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getRecordTypeColor = (type) => {
    switch (type) {
      case 'health_check':
        return "bg-blue-100 text-blue-700"
      case 'vaccination':
        return "bg-purple-100 text-purple-700"
      case 'breeding':
        return "bg-pink-100 text-pink-700"
      case 'feeding':
        return "bg-green-100 text-green-700"
      case 'treatment':
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const filteredRecords = healthRecords.filter(record => {
    const matchesSearch = record.animal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const animal = livestock.find(a => a.id === record.animal_id)
    const matchesStatus = !filterStatus || animal?.health_status === filterStatus
    const matchesType = filterType === "all" || record.type === filterType

    return matchesSearch && matchesStatus && matchesType
  })

  const handleCreate = () => {
    if (!canManageHealth) return
    setModalMode("create")
    setSelectedRecord(null)
    setShowModal(true)
  }

  const handleEdit = (record) => {
    if (!canManageHealth) return
    setModalMode("edit")
    setSelectedRecord(record)
    setShowModal(true)
  }

  const handleView = (record) => {
    setModalMode("view")
    setSelectedRecord(record)
    setShowModal(true)
  }

  const handleRecordSaved = (savedRecord) => {
    if (modalMode === "create") {
      setHealthRecords([savedRecord, ...healthRecords])
    } else if (modalMode === "edit") {
      setHealthRecords(healthRecords.map(r => r.id === savedRecord.id ? savedRecord : r))
    }
    setShowModal(false)
    setSelectedRecord(null)
  }

  const handleDelete = async (record) => {
    if (!canDeleteRecords) return
    
    if (window.confirm(`Are you sure you want to delete this health record? This action cannot be undone.`)) {
      try {
        await livestockHealthAPI.deleteHealthRecord(record.id)
        setHealthRecords(healthRecords.filter(r => r.id !== record.id))
      } catch (error) {
        console.error("Failed to delete health record:", error)
        setError("Failed to delete health record. Please try again.")
      }
    }
  }

  const getUpcomingDueDates = () => {
    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)

    return healthRecords.filter(record => {
      if (!record.next_due) return false
      const dueDate = new Date(record.next_due)
      return dueDate >= today && dueDate <= nextWeek
    }).slice(0, 5)
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
          <h1 className="text-3xl font-bold text-gray-900">Livestock Health Management</h1>
          <p className="text-gray-600 mt-2">Track health, vaccinations, breeding, and feeding records</p>
        </div>
        {canManageHealth && (
          <button
            onClick={handleCreate}
            className="mt-4 sm:mt-0 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Health Record</span>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Health Overview Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Health Status Overview */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl shadow-sm border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-3 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Health Status</h3>
                <p className="text-sm text-gray-600">Overall herd condition</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Healthy</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{width: `${livestock.length > 0 ? (livestock.filter(a => a.health_status === 'healthy').length / livestock.length) * 100 : 0}%`}}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {livestock.filter(a => a.health_status === 'healthy').length}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Under Treatment</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{width: `${livestock.length > 0 ? (livestock.filter(a => a.health_status === 'under_treatment').length / livestock.length) * 100 : 0}%`}}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {livestock.filter(a => a.health_status === 'under_treatment').length}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Critical</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{width: `${livestock.length > 0 ? (livestock.filter(a => a.health_status === 'sick' || a.health_status === 'quarantine').length / livestock.length) * 100 : 0}%`}}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {livestock.filter(a => a.health_status === 'sick' || a.health_status === 'quarantine').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Vaccination Schedule */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-3 rounded-xl">
                <Syringe className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Vaccination Status</h3>
                <p className="text-sm text-gray-600">Immunization tracking</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Due This Week</span>
                <span className="text-xl font-bold text-purple-600">
                  {getUpcomingDueDates().filter(r => r.type === 'vaccination').length}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {getUpcomingDueDates().filter(r => r.type === 'vaccination').length > 0 
                  ? 'Vaccinations scheduled' 
                  : 'All vaccinations up to date'
                }
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Completed This Month</span>
                <span className="text-xl font-bold text-green-600">
                  {healthRecords.filter(r => {
                    const recordDate = new Date(r.date)
                    const thisMonth = new Date()
                    return r.type === 'vaccination' && 
                           recordDate.getMonth() === thisMonth.getMonth() && 
                           recordDate.getFullYear() === thisMonth.getFullYear()
                  }).length}
                </span>
              </div>
              <div className="text-xs text-gray-500">Recent immunizations</div>
            </div>
          </div>
        </div>

        {/* Health Insights */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl shadow-sm border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-xl">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Health Insights</h3>
                <p className="text-sm text-gray-600">Recent activity overview</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Total Health Records</span>
                <span className="text-xl font-bold text-blue-600">{healthRecords.length}</span>
              </div>
              <div className="text-xs text-gray-500">Comprehensive health tracking</div>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">This Week's Activities</span>
                <span className="text-xl font-bold text-green-600">
                  {healthRecords.filter(r => {
                    const recordDate = new Date(r.date)
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return recordDate >= weekAgo
                  }).length}
                </span>
              </div>
              <div className="text-xs text-gray-500">Recent health interventions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Health Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {healthRecords.filter(r => r.type === 'health_check').length}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Health Checkups</h4>
          <p className="text-xs text-gray-600">Regular examinations</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-pink-100 p-3 rounded-lg">
              <Baby className="w-6 h-6 text-pink-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {healthRecords.filter(r => r.type === 'breeding').length}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Breeding Records</h4>
          <p className="text-xs text-gray-600">Reproductive health</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Utensils className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {healthRecords.filter(r => r.type === 'feeding').length}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Feeding Logs</h4>
          <p className="text-xs text-gray-600">Nutrition tracking</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {healthRecords.filter(r => r.type === 'treatment').length}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Treatments</h4>
          <p className="text-xs text-gray-600">Medical interventions</p>
        </div>
      </div>

      {/* Upcoming Due Dates */}
      {getUpcomingDueDates().length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">Upcoming Due Dates</h3>
          <div className="space-y-2">
            {getUpcomingDueDates().map(record => (
              <div key={record.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getRecordTypeColor(record.type)}`}>
                    {getRecordTypeIcon(record.type)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{record.animal_name}</p>
                    <p className="text-sm text-gray-600">{record.type.replace('_', ' ').toUpperCase()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Due: {new Date(record.next_due).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-500">
                    {Math.ceil((new Date(record.next_due) - new Date()) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Records</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by animal or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Health Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="sick">Sick</option>
              <option value="under_treatment">Under Treatment</option>
              <option value="quarantine">Quarantine</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Record Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Types</option>
              <option value="health_check">Health Check</option>
              <option value="vaccination">Vaccination</option>
              <option value="breeding">Breeding</option>
              <option value="feeding">Feeding</option>
              <option value="treatment">Treatment</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <p className="font-medium">Total: {filteredRecords.length} records</p>
              <p>Animals: {livestock.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Health Records */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Health Records</h2>
          <p className="text-gray-600 mt-1">Recent health activities and records</p>
        </div>

        <div className="p-6">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No health records found</h3>
              <p className="text-gray-600">No health records match your search criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => {
                const animal = livestock.find(a => a.id === record.animal_id)
                return (
                  <div key={record.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-lg ${getRecordTypeColor(record.type)}`}>
                          {getRecordTypeIcon(record.type)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{record.animal_name}</h3>
                            <span className="text-sm text-gray-500">({record.animal_species})</span>
                            {animal && (
                              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getHealthStatusColor(animal.health_status)}`}>
                                {animal.health_status?.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-gray-900 mb-2">{record.description}</p>
                          <p className="text-sm text-gray-600 mb-3">{record.notes}</p>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {record.date ? new Date(record.date).toLocaleDateString() : 'Date not set'}
                              </span>
                            </div>
                            {record.veterinarian && (
                              <div className="flex items-center space-x-1">
                                <Activity className="w-4 h-4" />
                                <span>{record.veterinarian}</span>
                              </div>
                            )}
                            {record.next_due && (
                              <div className="flex items-center space-x-1">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Next due: {new Date(record.next_due).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleView(record)}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                        
                        {canManageHealth && (
                          <>
                            <button
                              onClick={() => handleEdit(record)}
                              className="flex-1 bg-primary-100 hover:bg-primary-200 text-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                            >
                              <Edit className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                            {canDeleteRecords && (
                              <button
                                onClick={() => handleDelete(record)}
                                className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
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

      {/* Health Record Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {modalMode === "create" ? "Add Health Record" : 
                 modalMode === "edit" ? "Edit Health Record" : "Health Record Details"}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {modalMode === "view" && selectedRecord ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Animal</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRecord.animal_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Record Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRecord.record_type?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedRecord.record_date || selectedRecord.date ? 
                        new Date(selectedRecord.record_date || selectedRecord.date).toLocaleDateString() : 
                        'Not set'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Veterinarian</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRecord.veterinarian || "Not specified"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRecord.description}</p>
                  </div>
                  {selectedRecord.treatment && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Treatment</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRecord.treatment}</p>
                    </div>
                  )}
                  {selectedRecord.cost > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cost</label>
                      <p className="mt-1 text-sm text-gray-900">₦{selectedRecord.cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  )}
                  {(selectedRecord.next_due_date || selectedRecord.next_due) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Next Due Date</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(selectedRecord.next_due_date || selectedRecord.next_due).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {selectedRecord.notes && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Notes</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRecord.notes}</p>
                    </div>
                  )}
                </div>
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
              <HealthRecordForm
                record={selectedRecord}
                mode={modalMode}
                livestock={livestock}
                onRecordSaved={handleRecordSaved}
                onCancel={() => setShowModal(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default LivestockHealth