const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL
  }

  getToken() {
    return localStorage.getItem('admin_token')
  }

  setToken(token) {
    localStorage.setItem('admin_token', token)
  }

  clearToken() {
    localStorage.removeItem('admin_token')
  }

  async request(endpoint, options = {}) {
    const token = this.getToken()
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      this.clearToken()
      window.location.href = '/login'
      throw new Error('Unauthorized')
    }

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'Request failed')
    }

    return data
  }

  // Auth
  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (data.token) {
      this.setToken(data.token)
    }
    return data
  }

  async getMe() {
    return this.request('/api/auth/me')
  }

  // Admin endpoints
  async getAdminStats() {
    return this.request('/api/admin/stats')
  }

  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/api/admin/users${query ? `?${query}` : ''}`)
  }

  async getUser(id) {
    return this.request(`/api/admin/users/${id}`)
  }

  async updateUser(id, data) {
    return this.request(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteUser(id) {
    return this.request(`/api/admin/users/${id}`, {
      method: 'DELETE',
    })
  }

  async getSubscriptions(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/api/admin/subscriptions${query ? `?${query}` : ''}`)
  }

  async getAIUsage(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/api/admin/ai-usage${query ? `?${query}` : ''}`)
  }

  async getErrorLogs(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/api/admin/error-logs${query ? `?${query}` : ''}`)
  }

  async getSystemHealth() {
    return this.request('/api/admin/health')
  }
}

export const apiClient = new ApiClient()
export default apiClient

