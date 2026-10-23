<template>
  <AuthShell title="欢迎回来" subtitle="登录后继续记录你的阅读与思考">
    <div v-if="registered" class="alert alert-success auth-alert">
      <span class="alert__icon">✓</span>
      <span>注册成功，请使用新账号登录。</span>
    </div>

    <form class="auth-form" @submit.prevent="submit">
      <div v-if="error" class="alert alert-error auth-alert">
        <span class="alert__icon">!</span>
        <span>{{ error }}</span>
      </div>

      <div class="field">
        <label class="label" for="login-username">用户名</label>
        <input
          id="login-username"
          v-model.trim="form.username"
          class="input"
          type="text"
          name="username"
          autocomplete="username"
          placeholder="请输入用户名"
          :disabled="loading"
        />
      </div>

      <div class="field">
        <label class="label" for="login-password">密码</label>
        <div class="password-field">
          <input
            id="login-password"
            v-model="form.password"
            class="input"
            :type="showPassword ? 'text' : 'password'"
            name="password"
            autocomplete="current-password"
            placeholder="请输入密码"
            :disabled="loading"
          />
          <button
            type="button"
            class="password-field__toggle"
            :aria-label="showPassword ? '隐藏密码' : '显示密码'"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? '隐藏' : '显示' }}
          </button>
        </div>
      </div>

      <button class="btn btn-primary btn-lg btn-block" type="submit" :disabled="loading">
        <span v-if="loading" class="spinner"></span>
        {{ loading ? '登录中…' : '登录' }}
      </button>
    </form>

    <div class="demo-box">
      <span class="demo-box__title">演示账号</span>
      <div class="demo-box__items">
        <button type="button" class="demo-account" @click="fillDemo('admin', 'admin123')">
          <strong>admin</strong>
          <small>admin123 · 管理员</small>
        </button>
        <button type="button" class="demo-account" @click="fillDemo('demo01', '123456')">
          <strong>demo01</strong>
          <small>123456 · 普通用户</small>
        </button>
      </div>
    </div>

    <template #footer>
      还没有账号？
      <RouterLink :to="{ name: 'register', query: form.username ? { username: form.username } : {} }">
        立即注册
      </RouterLink>
    </template>
  </AuthShell>
</template>

<script>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthShell from '@/components/AuthShell.vue'
import auth from '@/store/auth'
import { notifyError, notifySuccess } from '@/store/toast'
import { displayName } from '@/utils/format'

export default {
  name: 'LoginView',
  components: { AuthShell },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const form = reactive({ username: '', password: '' })
    const loading = ref(false)
    const error = ref('')
    const showPassword = ref(false)
    const registered = computed(() => route.query.registered === '1')

    onMounted(() => {
      if (typeof route.query.username === 'string') {
        form.username = route.query.username
      }
      if (route.query.registered === '1') {
        notifySuccess('注册成功，请登录')
      }
    })

    function fillDemo(username, password) {
      form.username = username
      form.password = password
      error.value = ''
    }

    function resolveRedirect() {
      const redirect = route.query.redirect
      if (typeof redirect !== 'string' || !redirect.startsWith('/')) return '/'
      if (redirect.startsWith('/login') || redirect.startsWith('/register')) return '/'
      return redirect
    }

    async function submit() {
      error.value = ''
      if (!form.username.trim()) {
        error.value = '请输入用户名'
        return
      }
      if (!form.password) {
        error.value = '请输入密码'
        return
      }
      loading.value = true
      try {
        await auth.login(form.username.trim(), form.password)
        notifySuccess(`欢迎回来，${displayName(auth.state.user)}`)
        router.replace(resolveRedirect())
      } catch (err) {
        error.value = err.message || '登录失败'
        notifyError(err)
      } finally {
        loading.value = false
      }
    }

    return { form, loading, error, showPassword, registered, submit, fillDemo }
  }
}
</script>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
}

.auth-alert {
  margin-bottom: 18px;
}

.password-field {
  position: relative;
}

.password-field .input {
  padding-right: 60px;
}

.password-field__toggle {
  position: absolute;
  top: 50%;
  right: 6px;
  height: 30px;
  padding: 0 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.password-field__toggle:hover {
  background: var(--surface-2);
  color: var(--primary);
}

.demo-box {
  margin-top: 22px;
  padding: 14px;
  border: 1px dashed var(--border-strong);
  border-radius: 12px;
  background: var(--surface-2);
}

.demo-box__title {
  display: block;
  margin-bottom: 9px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.demo-box__items {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.demo-account {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.demo-account:hover {
  border-color: var(--primary);
  background: var(--primary-softer);
}

.demo-account strong {
  display: block;
  color: var(--text-2);
  font-size: 12px;
}

.demo-account small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 10px;
}
</style>
