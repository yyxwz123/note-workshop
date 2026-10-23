<template>
  <div class="admin-notes">
    <div class="card admin-toolbar">
      <form class="admin-search" @submit.prevent="search">
        <select
          v-model="statusFilter"
          class="select admin-filter"
          aria-label="按状态筛选"
          @change="onFilterChange"
        >
          <option value="">全部状态</option>
          <option value="1">已发布</option>
          <option value="2">待审核</option>
          <option value="3">已驳回</option>
          <option value="0">已下架</option>
        </select>
        <input
          v-model.trim="keyword"
          class="input admin-search__input"
          type="text"
          placeholder="搜索标题或书名"
          aria-label="搜索笔记"
        />
        <button class="btn btn-primary btn-sm" type="submit" :disabled="loading">搜索</button>
        <button
          v-if="appliedKeyword || statusFilter"
          class="btn btn-ghost btn-sm"
          type="button"
          @click="clearFilters"
        >
          清空
        </button>
      </form>
      <span class="admin-toolbar__meta">共 {{ total }} 篇笔记</span>
    </div>

    <div v-if="loading" class="card admin-loading">
      <div v-for="index in 5" :key="index" class="admin-loading__row">
        <div class="skeleton admin-loading__line"></div>
        <div class="skeleton admin-loading__line admin-loading__line--short"></div>
      </div>
    </div>

    <div v-else-if="error" class="card">
      <EmptyState icon="!" title="笔记列表加载失败" :description="error">
        <button type="button" class="btn btn-primary" @click="load">重新加载</button>
      </EmptyState>
    </div>

    <template v-else>
      <div v-if="notes.length" class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>笔记</th>
              <th>作者</th>
              <th>状态</th>
              <th>可见性</th>
              <th>数据</th>
              <th>发布时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="note in notes" :key="note.id">
              <td class="admin-notes__id">#{{ note.id }}</td>
              <td>
                <span class="table-title">{{ note.title || '无标题笔记' }}</span>
                <span class="table-sub">{{ note.bookName || '未分类' }}</span>
              </td>
              <td>
                <span class="table-sub">
                  {{ note.authorName || `用户 #${note.userId}` }}
                </span>
              </td>
              <td>
                <span class="badge" :class="`badge-${statusMeta(note.status).tone}`">
                  {{ statusMeta(note.status).label }}
                </span>
              </td>
              <td>
                <span class="badge" :class="note.isPublic === 1 ? 'badge-primary' : 'badge-muted'">
                  {{ note.isPublic === 1 ? '公开' : '私有' }}
                </span>
              </td>
              <td>
                <span class="table-sub">♥ {{ note.likeCount || 0 }} · 💬 {{ note.commentCount || 0 }}</span>
              </td>
              <td class="table-sub">{{ formatDate(note.createdAt) }}</td>
              <td>
                <div class="row-actions">
                  <RouterLink
                    v-if="note.isPublic === 1 && note.status === 1"
                    :to="`/notes/${note.id}`"
                    class="btn btn-outline btn-sm"
                  >
                    查看
                  </RouterLink>
                  <button
                    v-if="note.status !== 0"
                    type="button"
                    class="btn btn-danger btn-sm"
                    :disabled="takingId === note.id"
                    @click="takeDown(note)"
                  >
                    <span v-if="takingId === note.id" class="spinner spinner--dark"></span>
                    下架
                  </button>
                  <span v-else class="table-sub">已下架</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="card">
        <EmptyState
          icon="☰"
          title="没有匹配的笔记"
          description="尝试切换状态筛选，或清空搜索条件后再试。"
        >
          <button type="button" class="btn btn-outline" @click="clearFilters">清空筛选</button>
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
import AppPagination from '@/components/AppPagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatDate, noteStatusMeta } from '@/utils/format'

const PAGE_SIZE = 10

export default {
  name: 'AdminNotes',
  components: { AppPagination, EmptyState },
  setup() {
    const notes = ref([])
    const total = ref(0)
    const page = ref(1)
    const size = PAGE_SIZE
    const statusFilter = ref('')
    const keyword = ref('')
    const appliedKeyword = ref('')
    const loading = ref(true)
    const error = ref('')
    const takingId = ref(null)
    let seed = 0

    async function load() {
      const current = ++seed
      loading.value = true
      error.value = ''
      try {
        const params = { page: page.value, size: PAGE_SIZE }
        if (statusFilter.value !== '') params.status = Number(statusFilter.value)
        if (appliedKeyword.value) params.keyword = appliedKeyword.value
        const data = await api.get('/api/admin/notes', { params })
        if (current !== seed) return
        notes.value = Array.isArray(data.records) ? data.records : []
        total.value = Number(data.total) || 0
        const totalPages = Math.max(1, Math.ceil(total.value / PAGE_SIZE))
        if (page.value > totalPages) {
          page.value = totalPages
          load()
        }
      } catch (err) {
        if (current !== seed) return
        error.value = err.message || '笔记列表加载失败'
        notes.value = []
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

    function onFilterChange() {
      page.value = 1
      load()
    }

    function clearFilters() {
      statusFilter.value = ''
      keyword.value = ''
      appliedKeyword.value = ''
      page.value = 1
      load()
    }

    function changePage(next) {
      page.value = next
      load()
    }

    async function takeDown(note) {
      if (!note) return
      if (!window.confirm(`确定下架《${note.title || '无标题笔记'}》吗？下架后仅作者自己可见。`)) return
      takingId.value = note.id
      try {
        await api.put(`/api/admin/notes/${note.id}/take-down`)
        notifySuccess('笔记已下架')
        await load()
      } catch (err) {
        notifyError(err)
      } finally {
        takingId.value = null
      }
    }

    onMounted(load)

    return {
      notes,
      total,
      page,
      size,
      statusFilter,
      keyword,
      appliedKeyword,
      loading,
      error,
      takingId,
      load,
      search,
      onFilterChange,
      clearFilters,
      changePage,
      takeDown,
      formatDate,
      statusMeta: noteStatusMeta
    }
  }
}
</script>

<style scoped>
.admin-notes {
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
  max-width: 560px;
}

.admin-filter {
  width: 120px;
  height: 36px;
  flex: none;
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

.admin-notes__id {
  color: var(--muted-2);
  font-size: 12px;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}

.admin-loading {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px;
}

.admin-loading__row {
  display: flex;
  gap: 12px;
}

.admin-loading__line {
  flex: 1;
  height: 12px;
}

.admin-loading__line--short {
  flex: 0 0 20%;
}

@media (max-width: 760px) {
  .admin-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-search {
    max-width: none;
    flex-wrap: wrap;
  }

  .admin-filter {
    width: 100%;
  }

  .admin-search__input {
    flex-basis: 100%;
  }

  .admin-toolbar__meta {
    text-align: right;
  }
}
</style>
