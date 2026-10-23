<template>
  <header class="navbar">
    <div class="container navbar__inner">
      <RouterLink to="/" class="brand" @click="menuOpen = false">
        <span class="brand__mark">笔</span>
        <span class="brand__text">
          <strong>笔记工坊</strong>
          <small>NOTE WORKSHOP</small>
        </span>
      </RouterLink>

      <button
        class="navbar__toggle"
        type="button"
        :aria-expanded="menuOpen"
        aria-label="切换导航菜单"
        @click="menuOpen = !menuOpen"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav class="navbar__nav" :class="{ 'is-open': menuOpen }">
        <RouterLink to="/" class="nav-link" exact-active-class="is-active" @click="menuOpen = false">
          首页
        </RouterLink>
        <RouterLink v-if="loggedIn" to="/me" class="nav-link" active-class="is-active" @click="menuOpen = false">
          我的笔记
        </RouterLink>
        <RouterLink v-if="loggedIn" to="/ai" class="nav-link" active-class="is-active" @click="menuOpen = false">
          AI 助手
        </RouterLink>
        <RouterLink v-if="admin" to="/admin" class="nav-link" active-class="is-active" @click="menuOpen = false">
          管理后台
        </RouterLink>
      </nav>

      <div class="navbar__actions">
        <template v-if="loggedIn">
          <RouterLink to="/notes/new" class="btn btn-primary btn-sm navbar__publish">
            <span class="navbar__plus">＋</span> 发布
          </RouterLink>
          <RouterLink to="/profile" class="user-chip" title="个人资料">
            <UserAvatar :src="user.avatar" :name="nickname" :size="28" />
            <span class="user-chip__name">{{ nickname }}</span>
          </RouterLink>
          <button class="btn btn-ghost btn-sm" type="button" @click="handleLogout">退出</button>
        </template>
        <template v-else>
          <RouterLink to="/login" class="btn btn-ghost btn-sm">登录</RouterLink>
          <RouterLink to="/register" class="btn btn-primary btn-sm">注册</RouterLink>
        </template>
      </div>
    </div>
  </header>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UserAvatar from '@/components/UserAvatar.vue'
import auth from '@/store/auth'
import { notify } from '@/store/toast'
import { displayName } from '@/utils/format'

export default {
  name: 'NavBar',
  components: { UserAvatar },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const menuOpen = ref(false)

    const user = computed(() => auth.state.user || {})
    const nickname = computed(() => displayName(auth.state.user))
    const loggedIn = computed(() => auth.isLoggedIn())
    const admin = computed(() => auth.isAdmin())

    watch(
      () => route.fullPath,
      () => {
        menuOpen.value = false
      }
    )

    function handleLogout() {
      auth.logout()
      menuOpen.value = false
      notify('已退出登录', 'info')
      router.push('/')
    }

    return { user, nickname, loggedIn, admin, menuOpen, handleLogout }
  }
}
</script>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 60;
  border-bottom: 1px solid rgba(228, 233, 242, 0.9);
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(14px);
}

.navbar__inner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 26px;
  height: 68px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}

.brand__mark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(140deg, #4d7df8, #3b6ef6 60%, #2f5ee0);
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  box-shadow: 0 10px 18px -10px rgba(59, 110, 246, 0.9);
}

.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.brand__text strong {
  font-size: 16px;
  letter-spacing: -0.01em;
}

.brand__text small {
  margin-top: 3px;
  color: var(--muted-2);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.16em;
}

.navbar__nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.nav-link {
  padding: 8px 12px;
  border-radius: 8px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 600;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.nav-link:hover {
  color: var(--text);
  background: var(--surface-2);
}

.nav-link.is-active {
  color: var(--primary);
  background: var(--primary-soft);
}

.navbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 160px;
  padding: 3px 10px 3px 3px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-2);
  font-size: 13px;
  font-weight: 600;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.user-chip:hover {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 110, 246, 0.1);
}

.user-chip__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.navbar__toggle {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 36px;
  height: 36px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  cursor: pointer;
}

.navbar__toggle span {
  display: block;
  height: 2px;
  border-radius: 2px;
  background: var(--text-2);
}

@media (max-width: 900px) {
  .navbar__inner {
    height: 62px;
    gap: 12px;
  }

  .navbar__toggle {
    display: flex;
  }

  .navbar__nav {
    position: absolute;
    top: 61px;
    left: -18px;
    right: -18px;
    display: none;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding: 10px 18px 14px;
    border-bottom: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 18px 30px -22px rgba(23, 32, 51, 0.35);
  }

  .navbar__nav.is-open {
    display: flex;
  }

  .nav-link {
    padding: 11px 12px;
  }

  .navbar__actions {
    margin-left: auto;
  }

  .user-chip__name {
    display: none;
  }
}

@media (max-width: 560px) {
  .brand__text small {
    display: none;
  }

  .navbar__plus {
    display: none;
  }

  .navbar__actions .btn-ghost {
    padding: 0 8px;
  }
}
</style>
