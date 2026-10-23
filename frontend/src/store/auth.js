import { reactive } from 'vue'
import api from '@/api'

function readStoredUser() {
  try {
    const raw = localStorage.getItem('nw_user')
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    localStorage.removeItem('nw_user')
    return null
  }
}

function sanitizeUser(user) {
  if (!user) return null
  const copy = { ...user }
  delete copy.password
  return copy
}

const state = reactive({
  token: localStorage.getItem('nw_token') || '',
  user: sanitizeUser(readStoredUser())
})

function persist(token, user) {
  state.token = token || ''
  state.user = sanitizeUser(user)
  if (state.token) {
    localStorage.setItem('nw_token', state.token)
  } else {
    localStorage.removeItem('nw_token')
  }
  if (state.user) {
    localStorage.setItem('nw_user', JSON.stringify(state.user))
  } else {
    localStorage.removeItem('nw_user')
  }
}

function isLoggedIn() {
  return Boolean(state.token && state.user)
}

function isAdmin() {
  return Boolean(state.user && state.user.role === 'ADMIN')
}

async function login(username, password) {
  const data = await api.post('/api/auth/login', { username, password })
  if (!data || !data.token) {
    throw new Error('登录响应异常，请稍后重试')
  }
  persist(data.token, data.user)
  return state.user
}

function logout() {
  persist('', null)
}

function setUser(user) {
  state.user = sanitizeUser(user)
  if (state.user) {
    localStorage.setItem('nw_user', JSON.stringify(state.user))
  } else {
    localStorage.removeItem('nw_user')
  }
}

async function bootstrap() {
  if (!state.token) return
  try {
    const user = await api.get('/api/users/me')
    if (user) setUser(user)
  } catch (error) {
    // 401 已由 axios 拦截器统一清除登录态并跳转；其他错误保留本地登录态。
  }
}

export default {
  state,
  login,
  logout,
  setUser,
  isLoggedIn,
  isAdmin,
  bootstrap
}
