<template>
  <div class="admin-users">
    <div class="card admin-toolbar">
      <form class="admin-search" @submit.prevent="search">
        <input
          v-model.trim="keyword"
          class="input admin-search__input"
          type="text"
          placeholder="搜索用户名或昵称"
          aria-label="搜索用户"
        />
        <button class="btn btn-primary btn-sm" type="submit" :disabled="loading">搜索</button>
        <button
          v-if="appliedKeyword"
          class="btn btn-ghost btn-sm"
          type="button"
          @click="clearSearch"
        >
          清空
        </button>
      </form>
      <span class="admin-toolbar__meta">共 {{ total }} 位用户</span>
    </div>

    <div v-if="loading" class="card admin-loading">
      <div v-for="index in 5" :key="index" class="admin-loading__row">
        <div class="skeleton admin-loading__avatar"></div>
        <div class="skeleton admin-loading__line"></div>
        <div class="skeleton admin-loading__line admin-loading__line--short"></div>
      </div>
    </div>

    <div v-else-if="error" class="card">
      <EmptyState icon="!" title="用户列表加载失败" :description="error">
        <button type="button" class="btn btn-primary" @click="load">重新加载</button>
      </EmptyState>
    </div>

    <template v-else>
      <div v-if="users.length" class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户</th>
              <th>角色</th>
              <th>状态</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td class="admin-users__id">#{{ user.id }}</td>
              <td>
                <div class="user-cell">
                  <UserAvatar :src="user.avatar" :name="user.nickname || user.username" :size="32" />
                  <div class="user-cell__info">
                    <strong>{{ user.nickname || user.username }}</strong>
                    <small>@{{ user.username }}</small>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge" :class="user.role === 'ADMIN' ? 'badge-primary' : 'badge-muted'">
                  {{ user.role === 'ADMIN' ? '管理员' : '普通用户' }}
                </span>
              </td>
              <td>
                <span class="badge" :class="user.status === 1 ? 'badge-success' : 'badge-danger'">
                  {{ user.status === 1 ? '正常' : '已禁用' }}
                </span>
              </td>
              <td class="table-sub">{{ formatDate(user.createdAt) }}</td>
              <td>
                <button
                  type="button"
                  class="btn btn-sm"
                  :class="user.status === 1 ? 'btn-danger' : 'btn-outline'"
                  :disabled="togglingId === user.id || (user.role === 'ADMIN' && user.status === 1)"
                  :title="user.role === 'ADMIN' && user.status === 1 ? '管理员账号不可禁用' : ''"
                  @click="toggleStatus(user)"
                >
                  <span v-if="togglingId === user.id" class="spinner spinner--dark"></span>
                  {{ user.status === 1 ? '禁用' : '启用' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="card">
        <EmptyState
          icon="◉"
          :title="appliedKeyword ? '没有找到匹配的用户' : '还没有用户'"
          :description="appliedKeyword ? `没有用户名或昵称包含「${appliedKeyword}」的用户。` : '社区里还没有注册用户。'"
        >
          <button v-if="appliedKeyword" type="button" class="btn btn-outline" @click="clearSearch">
            清空搜索
          </button>
        </EmptyState>
      </div>

      <AppPagination :page="page" :size="size" :total="total" :disabled="loading" @change="changePage" />
    </template>
  </div>
</template>

<script>
import { onMounted, ref } from 'vue'
import api from '@/api'
import { notifyError, notifySuccess } from '@/store/toast'
import UserAvatar from '@/components/UserAvatar.vue'
import AppPagination from '@/components/AppPagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatDate } from '@/utils/format'

const PAGE_SIZE = 10

export default {
  name: 'AdminUsers',
  components: { UserAvatar, AppPagination, EmptyState },
  setup() {
    const users = ref([])
    const total = ref(0)
    const page = ref(1)
    const size = PAGE_SIZE
    const keyword = ref('')
    const appliedKeyword = ref('')
    const loading = ref(true)
    const error = ref('')
    const togglingId = ref(null)
    let seed = 0

    async function load() {
      const current = ++seed
      loading.value = true
      error.value = ''
      try {
        const params = { page: page.value, size: PAGE_SIZE }
        if (appliedKeyword.value) params.keyword = appliedKeyword.value
        const data = await api.get('/api/admin/users', { params })
        if (current !== seed) return
        users.value = Array.isArray(data.records) ? data.records : []
        total.value = Number(data.total) || 0
        const totalPages = Math.max(1, Math.ceil(total.value / PAGE_SIZE))
        if (page.value > totalPages) {
          page.value = totalPages
          load()
        }
      } catch (err) {
        if (current !== seed) return
        error.value = err.message || '用户列表加载失败'
        users.value = []
        total.value = 0
        notifyError(err)
      } finally {
        if (current === seed) loading.value = false
      }
    }

    function search() {
      appliedKeyword.value = keyword.value.trim()
      page.value = 1
      load()
    }

    function clearSearch() {
      keyword.value = ''
      appliedKeyword.value = ''
      page.value = 1
      load()
    }

    function changePage(next) {
      page.value = next
      load()
    }

    async function toggleStatus(user) {
      if (!user) return
      const target = user.status === 1 ? 0 : 1
      if (user.role === 'ADMIN' && target === 0) {
        notifyError('管理员账号不可禁用')
        return
      }
      const action = target === 0 ? '禁用' : '启用'
      if (!window.confirm(`确定要${action}用户「${user.nickname || user.username}」吗？`)) return
      togglingId.value = user.id
      try {
        await api.put(`/api/admin/users/${user.id}/status?status=${target}`)
        user.status = target
        notifySuccess(`已${action}用户「${user.nickname || user.username}」`)
      } catch (err) {
        notifyError(err)
      } finally {
        togglingId.value = null
      }
    }

    onMounted(load)

    return {
      users,
      total,
      page,
      size,
      keyword,
      appliedKeyword,
      loading,
      error,
      togglingId,
      load,
      search,
      clearSearch,
      changePage,
      toggleStatus,
      formatDate
    }
  }
}
</script>

<style scoped>
.admin-users {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.admin-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 18px;
}

.admin-search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 460px;
}

.admin-search__input {
  height: 36px;
  flex: 1;
  min-width: 0;
}

.admin-toolbar__meta {
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}

.admin-users__id {
  color: var(--muted-2);
  font-size: 12px;
  white-space: nowrap;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 170px;
}

.user-cell__info {
  min-width: 0;
}

.user-cell__info strong {
  display: block;
  overflow: hidden;
  max-width: 180px;
  color: var(--text-2);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-cell__info small {
  display: block;
  margin-top: 1px;
  color: var(--muted);
  font-size: 10px;
}

.admin-loading {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px;
}

.admin-loading__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-loading__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.admin-loading__line {
  flex: 1;
  height: 12px;
}

.admin-loading__line--short {
  flex: 0 0 18%;
}

@media (max-width: 640px) {
  .admin-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-search {
    max-width: none;
    flex-wrap: wrap;
  }

  .admin-search__input {
    flex-basis: 100%;
  }

  .admin-toolbar__meta {
    text-align: right;
  }
}
</style>
