import axios from 'axios'

const http = axios.create({
  baseURL: '',
  timeout: 15000
})

let redirectingToLogin = false

function clearAuthStorage() {
  localStorage.removeItem('nw_token')
  localStorage.removeItem('nw_user')
}

function redirectToLogin() {
  clearAuthStorage()
  if (typeof window === 'undefined') return
  if (window.location.pathname === '/login' || redirectingToLogin) return
  redirectingToLogin = true
  window.location.assign('/login')
}

http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nw_token')
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

http.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && typeof body === 'object' && typeof body.code !== 'undefined') {
      if (body.code === 0) {
        return body.data
      }
      const error = new Error(body.message || '请求失败，请稍后重试')
      error.code = body.code
      error.status = response.status
      if (body.code === 401) {
        redirectToLogin()
      }
      return Promise.reject(error)
    }
    return body
  },
  (error) => {
    if (error.response) {
      const body = error.response.data
      const code =
        body && typeof body.code !== 'undefined' ? body.code : error.response.status
      const message =
        (body && body.message) || `请求失败（HTTP ${error.response.status}）`
      const wrapped = new Error(message)
      wrapped.code = code
      wrapped.status = error.response.status
      if (code === 401 || error.response.status === 401) {
        redirectToLogin()
      }
      return Promise.reject(wrapped)
    }
    if (error.code === 'ECONNABORTED') {
      const timeoutError = new Error('请求超时，请稍后重试')
      timeoutError.code = 'TIMEOUT'
      return Promise.reject(timeoutError)
    }
    const networkError = new Error('网络异常，请确认后端服务已启动')
    networkError.code = 'NETWORK'
    return Promise.reject(networkError)
  }
)

export function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  return http.post('/api/files/upload', formData)
}

export default http
