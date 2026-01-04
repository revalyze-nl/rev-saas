import { createContext, useContext, useState, useEffect } from 'react'
import apiClient from '../lib/apiClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = apiClient.getToken()
    if (token) {
      apiClient.getMe()
        .then(data => {
          // getMe returns user object directly, not wrapped in {user: ...}
          setUser(data)
        })
        .catch(() => {
          apiClient.clearToken()
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const data = await apiClient.login(email, password)
    setUser(data.user)
    return data
  }

  const logout = () => {
    apiClient.clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

