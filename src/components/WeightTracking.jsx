import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { weightAPI, livestockAPI } from "../services/api"
import { queueAPICall, getCachedData, cacheData } from "../services/offlineSync"
import {
  Plus,
  Scale,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
  Filter,
  AlertTriangle,
  BarChart3,
  X,
  Eye
} from "lucide-react"
import { Line } from 'react-chartjs-2'

const WeightTracking = () => {
  const { user } = useAuth()
  const [livestock, setLivestock] = useState([])
  const [weightRecords, setWeightRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterSpecies, setFilterSpecies] = useState("")
  const [selectedAnimal, setSelectedAnimal] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState("create") // create, view
  const [selectedRecord, setSelectedRecord] = useState(null)
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
      
      if (navigator.onLine) {
        try {
          const [livestockResponse, weightResponse] = await Promise.all([
            livestockAPI.getLivestock(),
            weightAPI.getWeightRecords()
          ])
          
          setLivestock(livestockResponse.data)
          setWeightRecords(weightResponse.data)
          
          // Cache for offline use
          await cacheData.livestock(livestockResponse.data)
          await cacheData.weightRecords(weightResponse.data)
        } catch (apiError) {
          throw apiError
        }
      } else {
        throw new Error('Offline mode')
      }

      setError("")
    } catch (error) {
      console.error("Failed to fetch weight data:", error)
      
      // Load from cache
      try {
        const cachedLivestock = await getCachedData.livestock()
        const cachedWeights = await getCachedData.weightRecords()
        
        setLivestock(cachedLivestock || [])
        setWeightRecords(cachedWeights || [])
        setError("Using offline data. Some information may be outdated.")
      } catch (cacheError) {
        setError("Failed to load weight data. Please check your connection.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = (animalId = null) => {
    if (!canRecordWeight) return
    setModalMode("create")
    setSelectedRecord(null)
    setFormData({
      animal_id: animalId || "",
      weight_kg: "",
      date_recorded: new Date().toISOString().split('T')[0],
      body_condition_score: "",
      notes: ""
    })
    setShowModal(true)
  }

  const handleView = (animal) => {
    setModalMode("view")
    setSelectedRecord(animal)
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

      if (navigator.onLine) {
        const response = await weightAPI.createWeightRecord(weightData)
        setWeightRecords([response.data, ...weightRecords])
        await cacheData.weightRecords(response.data)
      } else {
        // Queue for sync
        await queueAPICall('/weight-records', 'POST', weightData, 'high')
        // Add optimistically to UI
        const tempRecord = { 
          ...weightData, 
          id: `temp_${Date.now()}`, 
          animal_name: livestock.find(l => l.id.toString() === formData.animal_id)?.name 
        }
        setWeightRecords([tempRecord, ...weightRecords])
      }
      
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

  // Get animal weight history
  const getAnimalWeightHistory = (animalId) => {
    return weightRecords
      .filter(record => record.animal_id.toString() === animalId.toString())
      .sort((a, b) => new Date(a.date_recorded) - new Date(b.date_recorded))
  }

  // Calculate weight trends
  const getWeightTrend = (animalId) => {
    const history = getAnimalWeightHistory(animalId)
    if (history.length < 2) return null
    
    const recent = history[history.length - 1]
    const previous = history[history.length - 2]
    const change = recent.weight_kg - previous.weight_kg
    
    return {
      change,
      percentage: ((change / previous.weight_kg) * 100).toFixed(1),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    }
  }

  // Get animals with concerning weight trends
  const getAlertsAnimals = () => {
    const alerts = []
    
    livestock.forEach(animal => {
      const trend = getWeightTrend(animal.id)
      const history = getAnimalWeightHistory(animal.id)
      
      if (trend && trend.change < -5) { // Lost more than 5kg
        alerts.push({
          animal,
          type: 'weight_loss',
          message: `Lost ${Math.abs(trend.change).toFixed(1)}kg (${trend.percentage}%)`,
          severity: 'high'
        })
      }
      
      if (history.length === 0) {
        alerts.push({
          animal,
          type: 'no_records',
          message: 'No weight records found',
          severity: 'medium'
        })
      }
      
      // Check for overdue weigh-ins (more than 30 days since last record)
      if (history.length > 0) {
        const lastRecord = history[history.length - 1]
        const daysSinceLastWeigh = Math.floor((Date.now() - new Date(lastRecord.date_recorded)) / (1000 * 60 * 60 * 24))
        
        if (daysSinceLastWeigh > 30) {
          alerts.push({
            animal,
            type: 'overdue',
            message: `Last weighed ${daysSinceLastWeigh} days ago`,
            severity: 'medium'
          })
        }
      }
    })
    
    return alerts
  }

  // Filter livestock based on search and filters
  const filteredLivestock = livestock.filter(animal => {
    const matchesSearch = animal.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         animal.identification_number?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSpecies = !filterSpecies || animal.species?.toLowerCase() === filterSpecies.toLowerCase()
    const matchesAnimal = !selectedAnimal || animal.id.toString() === selectedAnimal
    return matchesSearch && matchesSpecies && matchesAnimal
  })

  // Prepare chart data for selected animal
  const getChartData = (animalId) => {
    const history = getAnimalWeightHistory(animalId)
    
    return {
      labels: history.map(record => new Date(record.date_recorded).toLocaleDateString()),
      datasets: [{
        label: 'Weight (kg)',
        data: history.map(record => record.weight_kg),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#16a34a',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6
      }]
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Weight (kg)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    }
  }

  const alerts = getAlertsAnimals()

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

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Weight Alerts ({alerts.length})
          </h3>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{alert.animal.name}</p>
                  <p className="text-sm text-gray-600">{alert.message}</p>
                </div>
                <button
                  onClick={() => handleCreate(alert.animal.id)}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  Record Weight
                </button>
              </div>
            ))}
            {alerts.length > 5 && (
              <p className="text-sm text-gray-600 text-center">
                +{alerts.length - 5} more alerts
              </p>
            )}
          </div>
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
                placeholder="Search by name or ID..."
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Animal</label>
            <select
              value={selectedAnimal}
              onChange={(e) => setSelectedAnimal(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Animals</option>
              {livestock.map(animal => (
                <option key={animal.id} value={animal.id}>
                  {animal.name} ({animal.species})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <p className="font-medium">Records: {weightRecords.length}</p>
              <p>Animals: {filteredLivestock.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weight Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLivestock.map((animal) => {
          const history = getAnimalWeightHistory(animal.id)
          const trend = getWeightTrend(animal.id)
          const latestWeight = history.length > 0 ? history[history.length - 1] : null
          
          return (
            <div key={animal.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{animal.name}</h3>
                  <p className="text-gray-600 capitalize">{animal.species} • {animal.breed}</p>
                </div>
                {trend && (
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                    trend.trend === 'up' ? 'bg-green-100 text-green-800' :
                    trend.trend === 'down' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {trend.trend === 'up' ? <TrendingUp className="w-3 h-3" /> :
                     trend.trend === 'down' ? <TrendingDown className="w-3 h-3" /> :
                     <Scale className="w-3 h-3" />}
                    <span>{trend.percentage}%</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4">
                {latestWeight ? (
                  <>
                    <div className="flex items-center text-sm">
                      <Scale className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-medium">{latestWeight.weight_kg} kg</span>
                      {latestWeight.body_condition_score && (
                        <span className="ml-2 text-gray-600">BCS: {latestWeight.body_condition_score}/5</span>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{new Date(latestWeight.date_recorded).toLocaleDateString()}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">No weight records</p>
                )}
                
                <div className="text-sm text-gray-600">
                  <span>{history.length} record{history.length !== 1 ? 's' : ''}</span>
                  {trend && (
                    <span className="ml-2">
                      ({trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}kg)
                    </span>
                  )}
                </div>
              </div>

              {/* Mini chart */}
              {history.length > 1 && (
                <div className="mb-4 h-20">
                  <Line data={getChartData(animal.id)} options={{
                    ...chartOptions,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { display: false },
                      y: { display: false }
                    }
                  }} />
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => handleView(animal)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                >
                  <Eye className="w-4 h-4" />
                  <span>View</span>
                </button>
                
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
          )
        })}
      </div>

      {filteredLivestock.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scale className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No animals found</h3>
          <p className="text-gray-600">Try adjusting your search criteria</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {modalMode === "create" ? "Record Weight" : `${selectedRecord?.name} - Weight History`}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {modalMode === "create" ? (
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Body Condition Score (1-5)
                  </label>
                  <select
                    name="body_condition_score"
                    value={formData.body_condition_score}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select BCS</option>
                    <option value="1">1 - Very Thin</option>
                    <option value="2">2 - Thin</option>
                    <option value="3">3 - Average</option>
                    <option value="4">4 - Good</option>
                    <option value="5">5 - Excellent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Additional observations or notes"
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
            ) : (
              // View mode - show weight history and chart
              <div className="space-y-6">
                {selectedRecord && (
                  <>
                    {/* Chart */}
                    <div className="h-64">
                      <Line data={getChartData(selectedRecord.id)} options={chartOptions} />
                    </div>

                    {/* Weight History Table */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Weight History</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border border-gray-200 rounded-lg">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Weight (kg)</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">BCS</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Change</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getAnimalWeightHistory(selectedRecord.id).reverse().map((record, index, array) => {
                              const previousRecord = array[index + 1]
                              const change = previousRecord ? record.weight_kg - previousRecord.weight_kg : 0
                              
                              return (
                                <tr key={record.id} className="border-t border-gray-200">
                                  <td className="px-4 py-2 text-sm">{new Date(record.date_recorded).toLocaleDateString()}</td>
                                  <td className="px-4 py-2 text-sm font-medium">{record.weight_kg}</td>
                                  <td className="px-4 py-2 text-sm">{record.body_condition_score || '-'}</td>
                                  <td className="px-4 py-2 text-sm">
                                    {change !== 0 && (
                                      <span className={`flex items-center ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {change > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                        {change > 0 ? '+' : ''}{change.toFixed(1)}kg
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{record.notes || '-'}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default WeightTracking