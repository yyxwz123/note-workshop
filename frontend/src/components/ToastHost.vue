<template>
  <div class="toast-host" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.type}`"
        role="status"
        @click="removeToast(toast.id)"
      >
        <span class="toast__icon">{{ iconOf(toast.type) }}</span>
        <span class="toast__text">{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script>
import { toasts, removeToast } from '@/store/toast'

export default {
  name: 'ToastHost',
  setup() {
    const iconOf = (type) => {
      if (type === 'success') return '✓'
      if (type === 'error') return '!'
      return 'i'
    }
    return { toasts, removeToast, iconOf }
  }
}
</script>

<style scoped>
.toast-host {
  position: fixed;
  top: 84px;
  right: 22px;
  z-index: 120;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.55;
  cursor: pointer;
  pointer-events: auto;
}

.toast__icon {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary-700);
  font-size: 12px;
  font-weight: 800;
}

.toast--success {
  border-color: #c8ebd9;
}

.toast--success .toast__icon {
  background: var(--success-soft);
  color: var(--success);
}

.toast--error {
  border-color: #f6ccce;
}

.toast--error .toast__icon {
  background: var(--danger-soft);
  color: var(--danger);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

@media (max-width: 720px) {
  .toast-host {
    top: 72px;
    right: 16px;
  }
}
</style>
