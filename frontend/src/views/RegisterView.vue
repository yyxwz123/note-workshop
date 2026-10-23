<template>
  <AuthShell title="创建账号" subtitle="开始记录你的第一本读书笔记">
    <form class="auth-form" @submit.prevent="submit">
      <div v-if="error" class="alert alert-error auth-alert">
        <span class="alert__icon">!</span>
        <span>{{ error }}</span>
      </div>

      <div class="field">
        <label class="label" for="register-username">
          用户名
          <span class="form-hint">4–32 个字符</span>
        </label>
        <input
          id="register-username"
          v-model.trim="form.username"
          class="input"
          type="text"
          name="username"
          autocomplete="username"
          placeholder="用于登录，例如 reader2026"
          :disabled="loading"
        />
      </div>

      <div class="field">
        <label class="label" for="register-nickname">
          昵称
          <span class="form-hint">选填，默认与用户名相同</span>
        </label>
        <input
          id="register-nickname"
          v-model.trim="form.nickname"
          class="input"
          type="text"
          name="nickname"
          autocomplete="nickname"
          placeholder="你在社区里显示的名字"
          :disabled="loading"
        />
      </div>

      <div class="field">
        <label class="label" for="register-password">
          密码
          <span class="form-hint">6–32 个字符</span>
        </label>
        <input
          id="register-password"
          v-model="form.password"
          class="input"
          type="password"
          name="new-password"
          autocomplete="new-password"
          placeholder="设置登录密码"
          :disabled="loading"
        />
      </div>

      <div class="field">
        <label class="label" for="register-confirm">确认密码</label>
        <input
          id="register-confirm"
          v-model="form.confirmPassword"
          class="input"
          type="password"
          name="confirm-password"
          autocomplete="new-password"
          placeholder="再次输入密码"
          :disabled="loading"
        />
      </div>

      <button class="btn btn-primary btn-lg btn-block" type="submit" :disabled="loading">
        <span v-if="loading" class="spinner"></span>
        {{ loading ? '注册中…' : '注册账号' }}
      </button>
    </form>

    <template #footer>
      已经有账号？
      <RouterLink :to="{ name: 'login', query: form.username ? { username: form.username } : {} }">
        返回登录
      </RouterLink>
    </template>
  </AuthShell>
</template>

<script>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthShell from '@/components/AuthShell.vue'
import api from '@/api'
import { notifyError, notifySuccess } from '@/store/toast'

export default {
  name: 'RegisterView',
  components: { AuthShell },
  setup() {
    const router = useRouter()
    const form = reactive({
      username: '',
      nickname: '',
      password: '',
      confirmPassword: ''
    })
    const loading = ref(false)
    const error = ref('')

    function validate() {
      const username = form.username.trim()
      if (username.length < 4 || username.length > 32) {
        return '用户名长度需为 4–32 个字符'
      }
      if (form.nickname.trim().length > 32) {
        return '昵称不能超过 32 个字符'
      }
      if (form.password.length < 6 || form.password.length > 32) {
        return '密码长度需为 6–32 个字符'
      }
      if (form.password !== form.confirmPassword) {
        return '两次输入的密码不一致'
      }
      return ''
    }

    async function submit() {
      error.value = ''
      const message = validate()
      if (message) {
        error.value = message
        return
      }
      loading.value = true
      try {
        const payload = {
          username: form.username.trim(),
          password: form.password
        }
        if (form.nickname.trim()) payload.nickname = form.nickname.trim()
        await api.post('/api/auth/register', payload)
        notifySuccess('注册成功，请登录')
        router.replace({ name: 'login', query: { username: payload.username, registered: '1' } })
      } catch (err) {
        error.value = err.message || '注册失败，请稍后重试'
        notifyError(err)
      } finally {
        loading.value = false
      }
    }

    return { form, loading, error, submit }
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

.auth-form :deep(.field) {
  margin-bottom: 15px;
}
</style>
