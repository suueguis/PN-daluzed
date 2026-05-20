// src/api/authAPI.js
import axios from 'axios'
import axiosClient from './axiosClient'

/**
 * Usa axios directo (sin interceptor de token) para login,
 * porque en ese momento aún no tenemos access token.
 */
export const loginAPI = (email, password) =>
  axios.post('/api/v1/auth/login/', { email, password })

/**
 * Logout requiere el header Authorization: Bearer <access>
 * por eso usa axiosClient con interceptor.
 */
export const logoutAPI = (refreshToken) =>
  axiosClient.post('/api/v1/auth/logout/', { refresh: refreshToken })