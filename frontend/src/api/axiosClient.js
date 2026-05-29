// src/api/axiosClient.js
import axios from 'axios'
import useAuthStore from '../store/authStore'

const axiosClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// ── Request interceptor: inject Bearer token ──
axiosClient.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState()
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: silent refresh on 401 ──
let isRefreshing = false
let pendingQueue = []

const processQueue = (error, token = null) => {
  pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  pendingQueue = []
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return axiosClient(originalRequest)
          })
          .catch((err) => { throw err })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Cookie is sent automatically — no body needed
        const { data } = await axios.post(
          '/api/v1/auth/token/refresh/',
          {},
          { withCredentials: true }
        )
        useAuthStore.getState().setAccessToken(data.access)
        processQueue(null, data.access)
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        return axiosClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        useAuthStore.getState().clearAuth()
        globalThis.location.replace('/login')
        throw refreshError
      } finally {
        isRefreshing = false
      }
    }

    throw error
  }
)

export default axiosClient
