import axios from "axios"

// const API_BASE_URL = "https://acc-backend-zflo.onrender.com/api"
const API_BASE_URL = "https://studious-capybara-v7w6j77r7x7hww4p-6000.app.github.dev/api"
const api = axios.create({
  baseURL: API_BASE_URL,
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth API
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  sendVerification: (email) => api.post("/auth/send-verification", { email }),
  sendEmailVerification: (email) => api.post("/auth/send-verification", { email }), // Alias for backward compatibility
  verifyEmail: (token) => api.post("/auth/verify-email", { token }),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, newPassword) => api.post("/auth/reset-password", { token, newPassword }),
}

// User API
export const userAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (userData) => api.put("/users/profile", userData),
  getUsers: () => api.get("/users"),
  createUser: (userData) => api.post("/users", userData),
  updateUser: (userId, userData) => api.put(`/users/${userId}`, userData),
  deleteUser: (userId) => api.delete(`/users/${userId}`),
  uploadAvatar: (formData) => api.post("/users/avatar", formData),
  changePassword: (data) => api.put("/users/password", data),
  updateNotifications: (formData) => api.put("/users/notifications", formData),
}
// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get("/dashboard/stats"),
  getTasks: () => api.get("/dashboard/tasks"),
}

// Tasks API
export const tasksAPI = {
  getTasks: () => api.get("/tasks"),
  completeTask: (taskId) => api.put(`/tasks/${taskId}/complete`),
  createTask: (taskData) => api.post("/tasks", taskData),
  updateTask: (taskId, taskData) => api.put(`/tasks/${taskId}`, taskData),
  deleteTask: (taskId) => api.delete(`/tasks/${taskId}`),
  completeTaskWithEvidence: (taskData) =>
    api.post(`/tasks/${taskData.get('taskId')}/complete-with-evidence`, taskData),
  getTaskDetails: (taskId) => api.get(`/tasks/${taskId}/details`),
  getWeeklyHistory: () => api.get("/tasks/history/weekly"),
  getHistory: (params) => api.get(`/tasks/history/${params.week || 'current'}`),
}

// Events API
export const eventsAPI = {
  getEvents: () => api.get("/events"),
  createEvent: (eventData) => api.post("/events", eventData),
  updateEvent: (eventId, eventData) => api.put(`/events/${eventId}`, eventData),
  deleteEvent: (eventId) => api.delete(`/events/${eventId}`),
}

// Reports API
export const reportsAPI = {
  getStats: (params) => api.get("/reports/stats", { params }),
  getStaffPerformance: (params) => api.get("/reports/staff-performance", { params }),
  getTaskDistribution: (params) => api.get("/reports/task-distribution", { params }),
  getInsights: (params) => api.get("/reports/insights", { params }),
  exportReport: (params) => api.get("/reports/export", { params, responseType: "blob" }),
}

// Livestock API
export const livestockAPI = {
  getLivestock: () => api.get("/livestock"),
  getLivestockById: (id) => api.get(`/livestock/${id}`),
  createLivestock: (livestockData) => api.post("/livestock", livestockData),
  updateLivestock: (id, livestockData) => api.put(`/livestock/${id}`, livestockData),
  deleteLivestock: (id) => api.delete(`/livestock/${id}`),
}

// Farm Resources API
export const farmResourcesAPI = {
  getResources: () => api.get("/farm-resources"),
  getResourceById: (id) => api.get(`/farm-resources/${id}`),
  createResource: (resourceData) => api.post("/farm-resources", resourceData),
  updateResource: (id, resourceData) => api.put(`/farm-resources/${id}`, resourceData),
  deleteResource: (id) => api.delete(`/farm-resources/${id}`),
}

// Planting Tracker API
export const plantingAPI = {
  getPlantings: () => api.get("/plantings"),
  getPlantingById: (id) => api.get(`/plantings/${id}`),
  createPlanting: (plantingData) => api.post("/plantings", plantingData),
  updatePlanting: (id, plantingData) => api.put(`/plantings/${id}`, plantingData),
  deletePlanting: (id) => api.delete(`/plantings/${id}`),
}

// Livestock Health API
export const livestockHealthAPI = {
  getHealthRecords: () => api.get("/livestock-health"),
  getHealthRecordById: (id) => api.get(`/livestock-health/${id}`),
  createHealthRecord: (recordData) => api.post("/livestock-health", recordData),
  updateHealthRecord: (id, recordData) => api.put(`/livestock-health/${id}`, recordData),
  deleteHealthRecord: (id) => api.delete(`/livestock-health/${id}`),
}

// External Users API
export const externalUsersAPI = {
  getExternalUsers: () => api.get("/external-users"),
  getSuppliers: () => api.get("/external-users/suppliers"),
  getExternalUserById: (id) => api.get(`/external-users/${id}`),
  createExternalUser: (userData) => api.post("/external-users", userData),
  updateExternalUser: (id, userData) => api.put(`/external-users/${id}`, userData),
  deleteExternalUser: (id) => api.delete(`/external-users/${id}`),
}

export const subscribePush = (subscription) =>
  api.post("/notifications/subscribe", subscription)

// ============================================================================
// ENHANCED API ENDPOINTS FOR ALLIANCE CROPCRAFT SIMPLIFIED SPEC
// ============================================================================

// Pen Management API
export const penAPI = {
  getPens: () => api.get("/pens"),
  getPenById: (id) => api.get(`/pens/${id}`),
  createPen: (penData) => api.post("/pens", penData),
  updatePen: (id, penData) => api.put(`/pens/${id}`, penData),
  deletePen: (id) => api.delete(`/pens/${id}`),
  getPenAssignments: () => api.get("/pens/assignments"),
  createPenAssignment: (assignmentData) => api.post("/pens/assignments", assignmentData),
  updatePenAssignment: (id, assignmentData) => api.put(`/pens/assignments/${id}`, assignmentData),
  getMyAssignments: () => api.get("/pens/my-assignments"),
}

// Weight Records API
export const weightAPI = {
  getWeightRecords: (animalId) => api.get(`/weight-records${animalId ? `?animal_id=${animalId}` : ''}`),
  getAnimalWeightHistory: (animalId) => api.get(`/weight-records/animal/${animalId}`),
  createWeightRecord: (weightData) => api.post("/weight-records", weightData),
  updateWeightRecord: (id, weightData) => api.put(`/weight-records/${id}`, weightData),
  deleteWeightRecord: (id) => api.delete(`/weight-records/${id}`),
  getWeightTrends: (params) => api.get("/weight-records/trends", { params }),
  getWeightAlerts: () => api.get("/weight-records/alerts"),
}

// Breeding Management API
export const breedingAPI = {
  getBreedingEvents: (params) => api.get("/breeding/events", { params }),
  createBreedingEvent: (eventData) => api.post("/breeding/events", eventData),
  getPregnancyChecks: (params) => api.get("/breeding/pregnancy-checks", { params }),
  createPregnancyCheck: (checkData) => api.post("/breeding/pregnancy-checks", checkData),
  getBirths: (params) => api.get("/breeding/births", { params }),
  createBirth: (birthData) => api.post("/breeding/births", birthData),
  getBreedingStats: (params) => api.get("/breeding/stats", { params }),
  getDueDates: (params) => api.get("/breeding/due-dates", { params }),
  getPerformance: (params) => api.get("/breeding/performance", { params }),
}

// Enhanced Health Management API
export const healthAPI = {
  getVaccinations: (params) => api.get("/health/vaccinations", { params }),
  createVaccination: (vaccinationData) => api.post("/health/vaccinations", vaccinationData),
  getTreatments: (params) => api.get("/health/treatments", { params }),
  createTreatment: (treatmentData) => api.post("/health/treatments", treatmentData),
  getMortalities: (params) => api.get("/health/mortalities", { params }),
  createMortality: (mortalityData) => api.post("/health/mortalities", mortalityData),
  getHealthSummary: (animalId) => api.get(`/health/summary${animalId ? `/${animalId}` : ''}`),
  getVaccinationsDue: (params) => api.get("/health/vaccinations/due", { params }),
  getHealthStats: (params) => api.get("/health/stats", { params }),
}

// Feed Management API
export const feedAPI = {
  getRations: (params) => api.get("/feed/rations", { params }),
  createRation: (rationData) => api.post("/feed/rations", rationData),
  updateRation: (id, rationData) => api.put(`/feed/rations/${id}`, rationData),
  getFeedInventory: (params) => api.get("/feed/inventory", { params }),
  updateInventory: (id, inventoryData) => api.put(`/feed/inventory/${id}`, inventoryData),
  getFeedLogs: (params) => api.get("/feed/logs", { params }),
  createFeedLog: (feedLogData) => api.post("/feed/logs", feedLogData),
  updateFeedLog: (id, feedLogData) => api.put(`/feed/logs/${id}`, feedLogData),
  getRequirements: (params) => api.get("/feed/requirements", { params }),
  getEfficiency: (params) => api.get("/feed/efficiency", { params }),
  getPendingApprovals: () => api.get("/feed/pending-approvals"),
}

// Investor Management API
export const investorAPI = {
  getInvestors: () => api.get("/investors"),
  getInvestorById: (id) => api.get(`/investors/${id}`),
  createInvestor: (investorData) => api.post("/investors", investorData),
  updateInvestor: (id, investorData) => api.put(`/investors/${id}`, investorData),
  getInvestorAllocations: (params) => api.get("/investors/allocations", { params }),
  createAllocation: (allocationData) => api.post("/investors/allocations", allocationData),
  getInvestorDashboard: (investorId) => api.get(`/investors/${investorId}/dashboard`),
  getInvestorKPIs: (investorId, params) => api.get(`/investors/${investorId}/kpis`, { params }),
  getMyDashboard: () => api.get("/investors/my/dashboard"),
}

// Enhanced Notifications API
export const notificationsAPI = {
  getNotifications: (params) => api.get("/notifications", { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  createNotification: (notificationData) => api.post("/notifications", notificationData),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  getStats: () => api.get("/notifications/stats"),
  markAllRead: () => api.put("/notifications/mark-all-read"),
}

// Enhanced Reports API
export const enhancedReportsAPI = {
  getSupervisorReports: (supervisorId, params) => api.get(`/reports/supervisor/${supervisorId}`, { params }),
  getInvestorReports: (investorId, params) => api.get(`/reports/investor/${investorId}`, { params }),
  getHealthCoverageReport: (params) => api.get("/reports/health-coverage", { params }),
  getMortalityReport: (params) => api.get("/reports/mortality", { params }),
  getBreedingReport: (params) => api.get("/reports/breeding", { params }),
  getFeedEfficiencyReport: (params) => api.get("/reports/feed-efficiency", { params }),
  exportReport: (reportType, params) => api.get(`/reports/export/${reportType}`, { params, responseType: "blob" }),
}

export default api
