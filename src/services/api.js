import axios from "axios"

const API_BASE_URL = "/api"

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

export const subscribePush = (subscription) =>
  api.post("/notifications/subscribe", subscription)

export default api
