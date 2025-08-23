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

// Auto-logout on 401/403
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status
    if (status === 401 || status === 403) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  requestVerification: () => api.post('/auth/request-verification'),
  verifyEmail: (token) => api.get('/auth/verify', { params: { token } }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
}

// User API
export const userAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (userData) => api.put("/users/profile", userData),
  getUsers: () => api.get("/users"),
  createUser: (userData) => api.post("/users", userData),
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
  completeTaskWithEvidence: (taskData) =>
    api.post(`/tasks/${taskData.get('taskId')}/complete-with-evidence`, taskData),
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
  getCompletionTrend: (params) => api.get('/reports/completion-trend', { params }),
  getTaskDistribution: (params) => api.get('/reports/task-distribution', { params }),
  exportReport: (params) => api.get("/reports/export", { params, responseType: "blob" }),
}

export const subscribePush = (subscription) =>
  api.post("/notifications/subscribe", subscription)

export default api
