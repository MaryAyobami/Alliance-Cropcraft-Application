import { useState, useEffect } from "react"
import { plantingAPI } from "../services/api"

const PlantingForm = ({ planting: editPlanting, mode, onPlantingSaved, onCancel }) => {
  const [formData, setFormData] = useState({
    crop_name: "",
    variety: "",
    planting_date: "",
    expected_harvest_date: "",
    area_planted: "",
    location: "",
    growth_stage: "planted",
    plant_spacing: "",
    row_spacing: "",
    irrigation_schedule: "",
    irrigation_method: "",
    notes: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})

  // Growth stages
  const growthStages = [
    "planted",
    "germinated",
    "seedling",
    "vegetative",
    "flowering",
    "fruiting",
    "mature",
    "harvested"
  ]

  // Common crops (can be expanded)
  const commonCrops = [
    "Corn",
    "Wheat",
    "Rice",
    "Soybeans",
    "Tomatoes",
    "Potatoes",
    "Carrots",
    "Onions",
    "Lettuce",
    "Peppers",
    "Beans",
    "Cassava",
    "Yam",
    "Plantain"
  ]

  useEffect(() => {
    if (editPlanting && mode === "edit") {
      setFormData({
        crop_name: editPlanting.crop_name || "",
        variety: editPlanting.variety || "",
        planting_date: editPlanting.planting_date ? editPlanting.planting_date.split('T')[0] : "",
        expected_harvest_date: editPlanting.expected_harvest_date ? editPlanting.expected_harvest_date.split('T')[0] : "",
        area_planted: editPlanting.area_planted?.toString() || "",
        location: editPlanting.location || "",
        growth_stage: editPlanting.growth_stage || "planted",
        plant_spacing: editPlanting.plant_spacing || "",
        row_spacing: editPlanting.row_spacing || "",
        irrigation_schedule: editPlanting.irrigation_schedule || "",
        irrigation_method: editPlanting.irrigation_method || "",
        notes: editPlanting.notes || ""
      })
    }
  }, [editPlanting, mode])

  const validateForm = () => {
    const errors = {}

    if (!formData.crop_name.trim()) {
      errors.crop_name = "Crop name is required"
    }

    if (!formData.planting_date) {
      errors.planting_date = "Planting date is required"
    }

    if (!formData.area_planted || isNaN(formData.area_planted) || Number(formData.area_planted) <= 0) {
      errors.area_planted = "Valid area planted is required"
    }

    // Validate that expected harvest date is after planting date
    if (formData.planting_date && formData.expected_harvest_date) {
      if (new Date(formData.expected_harvest_date) <= new Date(formData.planting_date)) {
        errors.expected_harvest_date = "Harvest date must be after planting date"
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: "" })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
      const submitData = {
        crop_name:  formData.crop_name === "other"
      ? (formData.custom_crop_name || "").trim()
      : formData.crop_name.trim(),
        variety: formData.variety.trim(),
        planting_date: formData.planting_date,
        expected_harvest_date: formData.expected_harvest_date || null,
        area_planted: Number(formData.area_planted),
        location: formData.location.trim(),
        growth_stage: formData.growth_stage,
        plant_spacing: formData.plant_spacing.trim(),
        row_spacing: formData.row_spacing.trim(),
        irrigation_schedule: formData.irrigation_schedule.trim(),
        irrigation_method: formData.irrigation_method.trim(),
        notes: formData.notes.trim()
      }

      let response
      if (mode === "create") {
        response = await plantingAPI.createPlanting(submitData)
      } else {
        response = await plantingAPI.updatePlanting(editPlanting.id, submitData)
      }

      if (onPlantingSaved) {
        onPlantingSaved(response.data)
      }
    } catch (err) {
      console.error("Planting save error:", err)
      const errorData = err.response?.data
      
      if (errorData?.field) {
        setFieldErrors({ [errorData.field]: errorData.message })
      } else if (errorData?.message) {
        setError(errorData.message)
      } else {
        setError(mode === "create" ? "Failed to create planting record" : "Failed to update planting record")
      }
    } finally {
      setLoading(false)
    }
  }

  const getFieldClassName = (fieldName) => {
    const baseClass = "w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 transition-colors"
    if (fieldErrors[fieldName]) {
      return `${baseClass} border-red-500 focus:ring-red-200`
    }
    return `${baseClass} border-gray-300 focus:ring-primary-200 focus:border-primary-500`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Crop Name <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <select
              name="crop_name"
              value={formData.crop_name}
              onChange={handleChange}
              className={getFieldClassName('crop_name')}
            >
              <option value="">Select crop</option>
              {commonCrops.map(crop => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
              <option value="other">Other (specify below)</option>
            </select>
            {formData.crop_name === "other" && (
              <input
                type="text"
                name="custom_crop_name"
                value={formData.custom_crop_name || ""}
                onChange={(e) => setFormData({ ...formData, custom_crop_name: e.target.value })}
                className={getFieldClassName('crop_name')}
                placeholder="Enter crop name"
              />
            )}
          </div>
          {fieldErrors.crop_name && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.crop_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Variety</label>
          <input
            type="text"
            name="variety"
            value={formData.variety}
            onChange={handleChange}
            className={getFieldClassName('variety')}
            placeholder="Enter variety (optional)"
          />
          {fieldErrors.variety && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.variety}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Planting Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="planting_date"
            value={formData.planting_date}
            onChange={handleChange}
            className={getFieldClassName('planting_date')}
          />
          {fieldErrors.planting_date && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.planting_date}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Harvest Date</label>
          <input
            type="date"
            name="expected_harvest_date"
            value={formData.expected_harvest_date}
            onChange={handleChange}
            className={getFieldClassName('expected_harvest_date')}
          />
          {fieldErrors.expected_harvest_date && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.expected_harvest_date}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Area Planted (hectares) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="area_planted"
            value={formData.area_planted}
            onChange={handleChange}
            className={getFieldClassName('area_planted')}
            placeholder="Enter area in hectares"
            min="0.01"
            step="0.01"
          />
          {fieldErrors.area_planted && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.area_planted}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className={getFieldClassName('location')}
            placeholder="Field/plot location"
          />
          {fieldErrors.location && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.location}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Growth Stage</label>
          <select
            name="growth_stage"
            value={formData.growth_stage}
            onChange={handleChange}
            className={getFieldClassName('growth_stage')}
          >
            {growthStages.map(stage => (
              <option key={stage} value={stage}>
                {stage.charAt(0).toUpperCase() + stage.slice(1)}
              </option>
            ))}
          </select>
          {fieldErrors.growth_stage && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.growth_stage}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plant Spacing (cm)</label>
          <input
            type="number"
            name="plant_spacing"
            value={formData.plant_spacing}
            onChange={handleChange}
            className={getFieldClassName('plant_spacing')}
            placeholder="e.g., 30"
            min="1"
            step="1"
          />
          {fieldErrors.plant_spacing && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.plant_spacing}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Row Spacing (cm)</label>
          <input
            type="number"
            name="row_spacing"
            value={formData.row_spacing}
            onChange={handleChange}
            className={getFieldClassName('row_spacing')}
            placeholder="e.g., 75"
            min="1"
            step="1"
          />
          {fieldErrors.row_spacing && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.row_spacing}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Irrigation Method</label>
          <select
            name="irrigation_method"
            value={formData.irrigation_method}
            onChange={handleChange}
            className={getFieldClassName('irrigation_method')}
          >
            <option value="">Select irrigation method</option>
            <option value="drip">Drip Irrigation</option>
            <option value="sprinkler">Sprinkler</option>
            <option value="furrow">Furrow</option>
            <option value="flood">Flood</option>
            <option value="manual">Manual Watering</option>
            <option value="rainfed">Rain-fed</option>
          </select>
          {fieldErrors.irrigation_method && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.irrigation_method}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Irrigation Schedule</label>
          <input
            type="text"
            name="irrigation_schedule"
            value={formData.irrigation_schedule}
            onChange={handleChange}
            className={getFieldClassName('irrigation_schedule')}
            placeholder="e.g., Every 2 days, Twice weekly"
          />
          {fieldErrors.irrigation_schedule && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.irrigation_schedule}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className={getFieldClassName('notes')}
            placeholder="Any additional notes about this planting..."
          />
          {fieldErrors.notes && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.notes}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {mode === "create" ? "Creating..." : "Updating..."}
            </span>
          ) : (
            mode === "create" ? "Create Planting" : "Update Planting"
          )}
        </button>
      </div>
    </form>
  )
}

export default PlantingForm