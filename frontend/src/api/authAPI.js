// src/api/authAPI.js
import axios from 'axios'
import axiosClient from './axiosClient'

// withCredentials so Django can set the HttpOnly refresh cookie
export const loginAPI = (email, password) =>
  axios.post(`${import.meta.env.VITE_API_URL ?? ''}/api/v1/auth/login/`, { email, password }, { withCredentials: true })

// Cookie is sent automatically; no refresh body needed
export const logoutAPI = () =>
  axiosClient.post('/api/v1/auth/logout/')

export const cambiarContrasenaAPI = (contrasena_actual, nueva_contrasena, confirmar_contrasena) =>
  axiosClient.post('/api/v1/auth/cambiar-contrasena/', {
    contrasena_actual,
    nueva_contrasena,
    confirmar_contrasena,
  })
