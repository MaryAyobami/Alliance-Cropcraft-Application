import { useState } from "react"
import { Map, MapPin, Layers, Zap, Home, Barn, Tractor, Info, X } from "lucide-react"

const FarmMap = () => {
  const [selectedLayer, setSelectedLayer] = useState("overview")
  const [showInfo, setShowInfo] = useState(false)

  const mapLayers = [
    { id: "overview", name: "Overview", icon: Map },
    { id: "livestock", name: "Livestock Areas", icon: Barn },
    { id: "crops", name: "Crop Fields", icon: Layers },
    { id: "equipment", name: "Equipment", icon: Tractor },
    { id: "infrastructure", name: "Infrastructure", icon: Home }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Farm Map</h1>
          <p className="text-gray-600 mt-2">Interactive map showing farm layout and locations</p>
        </div>
        <button
          onClick={() => setShowInfo(true)}
          className="mt-4 sm:mt-0 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
        >
          <Info className="w-5 h-5" />
          <span>Map Info</span>
        </button>
      </div>

      {/* Map Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-2">
          {mapLayers.map((layer) => {
            const Icon = layer.icon
            return (
              <button
                key={layer.id}
                onClick={() => setSelectedLayer(layer.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedLayer === layer.id
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{layer.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
          <div className="text-center">
            <Map className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Interactive Farm Map</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              This will display a comprehensive interactive map of your farm with different layers showing 
              livestock areas, crop fields, equipment locations, and infrastructure.
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>🗺️ Real-time location tracking</p>
              <p>🚜 Equipment positioning</p>
              <p>🐄 Livestock area monitoring</p>
              <p>🌾 Field boundary mapping</p>
              <p>🏠 Infrastructure layout</p>
            </div>
          </div>
        </div>

        {/* Map Legend */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <h4 className="font-semibold text-gray-900 mb-3">Current Layer: {mapLayers.find(l => l.id === selectedLayer)?.name}</h4>
          <div className="space-y-2 text-sm">
            {selectedLayer === "overview" && (
              <>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Farm Boundaries</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Water Sources</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-brown-500 rounded-full"></div>
                  <span>Buildings</span>
                </div>
              </>
            )}
            {selectedLayer === "livestock" && (
              <>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Cattle Areas</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Poultry Areas</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span>Grazing Zones</span>
                </div>
              </>
            )}
            {selectedLayer === "crops" && (
              <>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span>Active Fields</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-brown-400 rounded-full"></div>
                  <span>Fallow Land</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                  <span>Harvest Ready</span>
                </div>
              </>
            )}
            {selectedLayer === "equipment" && (
              <>
                <div className="flex items-center space-x-2">
                  <Tractor className="w-3 h-3 text-blue-600" />
                  <span>Active Equipment</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span>Parked Equipment</span>
                </div>
              </>
            )}
            {selectedLayer === "infrastructure" && (
              <>
                <div className="flex items-center space-x-2">
                  <Home className="w-3 h-3 text-brown-600" />
                  <span>Buildings</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="w-3 h-3 text-yellow-600" />
                  <span>Utilities</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
                  <span>Roads/Paths</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Map Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Area</p>
              <p className="text-2xl font-bold text-gray-900">245 acres</p>
            </div>
            <Map className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Fields</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
            <Layers className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Livestock Areas</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
            <Barn className="w-8 h-8 text-brown-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Equipment Points</p>
              <p className="text-2xl font-bold text-gray-900">15</p>
            </div>
            <Tractor className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Farm Map Features</h3>
              <button 
                onClick={() => setShowInfo(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Planned Features</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• GPS integration for real-time equipment tracking</li>
                  <li>• Satellite imagery overlay with field boundaries</li>
                  <li>• Interactive markers for livestock, equipment, and infrastructure</li>
                  <li>• Weather overlay showing precipitation and temperature zones</li>
                  <li>• Soil type mapping and crop rotation planning</li>
                  <li>• Historical data visualization and analysis</li>
                  <li>• Mobile app integration for field updates</li>
                  <li>• Integration with IoT sensors for environmental monitoring</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Layer Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">Overview Layer</p>
                    <p className="text-gray-600">Complete farm layout with boundaries and main features</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Livestock Layer</p>
                    <p className="text-gray-600">Animal locations, grazing areas, and enclosures</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Crops Layer</p>
                    <p className="text-gray-600">Field boundaries, crop types, and growth stages</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Equipment Layer</p>
                    <p className="text-gray-600">Machinery locations and maintenance areas</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setShowInfo(false)}
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

export default FarmMap