import { useState, useEffect } from "react"
import { livestockHealthAPI } from "../services/api"

const HealthRecordForm = ({ record: editRecord, mode, livestock, onRecordSaved, onCancel }) => {
  const [formData, setFormData] = useState({
    livestock_id: "",
    record_type: "",
    record_date: "",
    description: "",
    treatment: "",
    veterinarian: "",
    cost: "",
    next_due_date: "",
    notes: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})

  // Record types
  const recordTypes = [
    "health_check",
    "vaccination",
    "treatment",
    "breeding",
    "feeding",
    "weight_check",
    "deworming",
    "injury",
    "illness",
    "death",
    "other"
  ]

  useEffect(() => {
    if (editRecord && mode === "edit") {
      setFormData({
        livestock_id: editRecord.livestock_id?.toString() || "",
        record_type: editRecord.record_type || "",
        record_date: editRecord.record_date ? editRecord.record_date.split('T')[0] : "",
        description: editRecord.description || "",
        treatment: editRecord.treatment || "",
        veterinarian: editRecord.veterinarian || "",
        cost: editRecord.cost?.toString() || "",
        next_due_date: editRecord.next_due_date ? editRecord.next_due_date.split('T')[0] : "",
        notes: editRecord.notes || ""
      })
    }
  }, [editRecord, mode])

  const validateForm = () => {
    const errors = {}

    if (!formData.livestock_id) {
      errors.livestock_id = "Animal selection is required"
    }

    if (!formData.record_type) {
      errors.record_type = "Record type is required"
    }

    if (!formData.record_date) {
      errors.record_date = "Record date is required"
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required"
    }

    if (formData.cost && (isNaN(formData.cost) || Number(formData.cost) < 0)) {
      errors.cost = "Cost must be a valid positive number"
    }

    // Validate that next due date is after record date
    if (formData.record_date && formData.next_due_date) {
      if (new Date(formData.next_due_date) <= new Date(formData.record_date)) {
        errors.next_due_date = "Next due date must be after record date"
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
        livestock_id: Number(formData.livestock_id),
        record_type: formData.record_type,
        record_date: formData.record_date,
        description: formData.description.trim(),
        treatment: formData.treatment.trim(),
        veterinarian: formData.veterinarian.trim(),
        cost: formData.cost ? Number(formData.cost) : 0,
        next_due_date: formData.next_due_date || null,
        notes: formData.notes.trim()
      }

      let response
      if (mode === "create") {
        response = await livestockHealthAPI.createHealthRecord(submitData)
      } else {
        response = await livestockHealthAPI.updateHealthRecord(editRecord.id, submitData)
      }

      if (onRecordSaved) {
        onRecordSaved(response.data)
      }
    } catch (err) {
      console.error("Health record save error:", err)
      const errorData = err.response?.data
      
      if (errorData?.field) {
        setFieldErrors({ [errorData.field]: errorData.message })
      } else if (errorData?.message) {
        setError(errorData.message)
      } else {
        setError(mode === "create" ? "Failed to create health record" : "Failed to update health record")
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

  const formatRecordType = (type) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
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
            Animal <span className="text-red-500">*</span>
          </label>
          <select
            name="livestock_id"
            value={formData.livestock_id}
            onChange={handleChange}
            className={getFieldClassName('livestock_id')}
          >
            <option value="">Select animal</option>
            {livestock.map(animal => (
              <option key={animal.id} value={animal.id}>
                {animal.name} ({animal.species}) - {animal.identification_number || `ID: ${animal.id}`}
              </option>
            ))}
          </select>
          {fieldErrors.livestock_id && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.livestock_id}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Record Type <span className="text-red-500">*</span>
          </label>
          <select
            name="record_type"
            value={formData.record_type}
            onChange={handleChange}
            className={getFieldClassName('record_type')}
          >
            <option value="">Select record type</option>
            {recordTypes.map(type => (
              <option key={type} value={type}>{formatRecordType(type)}</option>
            ))}
          </select>
          {fieldErrors.record_type && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.record_type}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Record Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="record_date"
            value={formData.record_date}
            onChange={handleChange}
            className={getFieldClassName('record_date')}
          />
          {fieldErrors.record_date && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.record_date}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date</label>
          <input
            type="date"
            name="next_due_date"
            value={formData.next_due_date}
            onChange={handleChange}
            className={getFieldClassName('next_due_date')}
          />
          <p className="text-xs text-gray-500 mt-1">For vaccinations, treatments, or checkups</p>
          {fieldErrors.next_due_date && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.next_due_date}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className={getFieldClassName('description')}
            placeholder="Describe the health record details..."
          />
          {fieldErrors.description && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.description}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Treatment</label>
          <input
            type="text"
            name="treatment"
            value={formData.treatment}
            onChange={handleChange}
            className={getFieldClassName('treatment')}
            placeholder="Treatment given (if any)"
          />
          {fieldErrors.treatment && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.treatment}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Veterinarian</label>
          <input
            type="text"
            name="veterinarian"
            value={formData.veterinarian}
            onChange={handleChange}
            className={getFieldClassName('veterinarian')}
            placeholder="Veterinarian name"
          />
          {fieldErrors.veterinarian && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.veterinarian}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost (₦)</label>
          <input
            type="number"
            name="cost"
            value={formData.cost}
            onChange={handleChange}
            className={getFieldClassName('cost')}
            placeholder="Cost in Naira"
            min="0"
            step="0.01"
          />
          {fieldErrors.cost && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.cost}</p>
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
            placeholder="Additional notes or observations..."
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
            mode === "create" ? "Create Record" : "Update Record"
          )}
        </button>
      </div>
    </form>
  )
}

export default HealthRecordForm