import { reactive } from 'vue'

export const toasts = reactive([])

let seed = 0

export function notify(message, type = 'info', duration = 3200) {
  const id = ++seed
  toasts.push({ id, message: String(message || ''), type })
  if (duration > 0) {
    window.setTimeout(() => removeToast(id), duration)
  }
  return id
}

export function notifySuccess(message) {
  return notify(message, 'success')
}

export function notifyError(error) {
  const message =
    typeof error === 'string'
      ? error
      : (error && error.message) || '操作失败，请稍后重试'
  return notify(message, 'error', 4200)
}

export function removeToast(id) {
  const index = toasts.findIndex((item) => item.id === id)
  if (index !== -1) toasts.splice(index, 1)
}
