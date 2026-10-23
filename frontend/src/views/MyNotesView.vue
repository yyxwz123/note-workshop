<template>
  <div class="container my-notes-page">
    <div class="page-head">
      <div>
        <span class="eyebrow">MY NOTES</span>
        <h1>我的笔记</h1>
        <p>共 {{ total }} 篇笔记，公开笔记需要审核通过后才会展示在首页。</p>
      </div>
      <RouterLink to="/notes/new" class="btn btn-primary">＋ 发布新笔记</RouterLink>
    </div>

    <div v-if="loading && !notes.length" class="my-list">
      <div v-for="index in 4" :key="index" class="card my-note-skeleton">
        <div class="skeleton my-note-skeleton__tag"></div>
        <div class="skeleton my-note-skeleton__title"></div>
        <div class="skeleton my-note-skeleton__line"></div>
        <div class="skeleton my-note-skeleton__line my-note-skeleton__line--short"></div>
      </div>
    </div>

    <div v-else-if="error" class="card">
      <EmptyState icon="!" title="我的笔记加载失败" :description="error">
        <button type="button" class="btn btn-primary" @click="loadNotes">重新加载</button>
        <RouterLink to="/" class="btn btn-outline">返回首页</RouterLink>
      </EmptyState>
    </div>

    <template v-else>
      <div v-if="notes.length" class="my-list" :class="{ 'is-loading': loading }">
        <article v-for="note in notes" :key="note.id" class="card my-note">
          <div class="my-note__main">
            <div class="my-note__tags">
              <span class="tag">{{ note.bookName || '未分类' }}</span>
              <span class="badge" :class="`badge-${statusMeta(note.status).tone}`">
                {{ statusMeta(note.status).label }}
              </span>
              <span v-if="note.isPublic === 0" class="badge badge-muted">私有</span>
            </div>

            <RouterLink :to="`/notes/${note.id}`" class="my-note__title">
              <h2>{{ note.title || '无标题笔记' }}</h2>
            </RouterLink>

            <p class="my-note__excerpt">{{ excerpt(note.content, 170) }}</p>

            <div class="my-note__meta">
              <span>{{ formatDate(note.createdAt) }}</span>
              <span>♥ {{ note.likeCount || 0 }} 点赞</span>
              <span>💬 {{ note.commentCount || 0 }} 评论</span>
            </div>

            <div
              v-if="note.status === 3 && note.rejectReason"
              class="alert alert-error my-note__reject"
            >
              <span class="alert__icon">!</span>
              <span><strong>驳回原因：</strong>{{ note.rejectReason }}</span>
            </div>
          </div>

          <div class="my-note__actions">
            <RouterLink :to="`/notes/${note.id}`" class="btn btn-outline btn-sm">查看</RouterLink>
            <RouterLink :to="`/notes/${note.id}/edit`" class="btn btn-primary btn-sm">编辑</RouterLink>
            <button
              type="button"
              class="btn btn-danger btn-sm"
              :disabled="deletingId === note.id"
              @click="removeNote(note)"
            >
              <span v-if="deletingId === note.id" class="spinner spinner--dark"></span>
              删除
            </button>
          </div>
        </article>
      </div>

      <div v-else class="card">
        <EmptyState
          icon="书"
          title="还没有写下任何笔记"
          description="从一本最近读过的书开始，记录一句印象深刻的话也好。"
        >
          <RouterLink to="/notes/new" class="btn btn-primary">写第一篇笔记</RouterLink>
          <RouterLink to="/" class="btn btn-outline">去首页看看</RouterLink>
        </EmptyState>
      </div>

      <AppPagination
        :page="page"
        :size="size"
        :total="total"
        :disabled="loading"
        @change="changePage"
      />
    </template>
  </div>
</template>

<script>
import { onMounted, ref } from 'vue'
import api from '@/api'
import { notifyError, notifySuccess } from '@/store/toast'
import AppPagination from '@/components/AppPagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { excerpt, formatDate, noteStatusMeta } from '@/utils/format'

const PAGE_SIZE = 8

export default {
  name: 'MyNotesView',
  components: { AppPagination, EmptyState },
  setup() {
    const notes = ref([])
    const total = ref(0)
    const page = ref(1)
    const loading = ref(true)
    const error = ref('')
    const deletingId = ref(null)
    const size = PAGE_SIZE
    let requestSeed = 0

    async function loadNotes() {
      const seed = ++requestSeed
      loading.value = true
      error.value = ''
      try {
        const data = await api.get('/api/notes/mine', {
          params: { page: page.value, size: PAGE_SIZE }
        })
        if (seed !== requestSeed) return
        notes.value = Array.isArray(data.records) ? data.records : []
        total.value = Number(data.total) || 0
        const totalPages = Math.max(1, Math.ceil(total.value / PAGE_SIZE))
        if (page.value > totalPages) {
          page.value = totalPages
          loadNotes()
        }
      } catch (err) {
        if (seed !== requestSeed) return
        error.value = err.message || '我的笔记加载失败'
        notes.value = []
        total.value = 0
        notifyError(err)
      } finally {
        if (seed === requestSeed) loading.value = false
      }
    }

    function changePage(next) {
      page.value = next
      loadNotes()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    async function removeNote(note) {
      if (!note) return
      if (!window.confirm(`确定删除《${note.title || '无标题笔记'}》吗？删除后无法恢复。`)) return
      deletingId.value = note.id
      try {
        await api.delete(`/api/notes/${note.id}`)
        notifySuccess('笔记已删除')
        if (notes.value.length === 1 && page.value > 1) {
          page.value -= 1
        }
        await loadNotes()
      } catch (err) {
        notifyError(err)
      } finally {
        deletingId.value = null
      }
    }

    onMounted(loadNotes)

    return {
      notes,
      total,
      page,
      size,
      loading,
      error,
      deletingId,
      loadNotes,
      changePage,
      removeNote,
      excerpt,
      formatDate,
      statusMeta: noteStatusMeta
    }
  }
}
</script>

<style scoped>
.my-notes-page {
  max-width: 980px;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 26px;
}

.page-head h1 {
  margin-top: 12px;
  font-size: 30px;
  letter-spacing: -0.035em;
}

.page-head p {
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
}

.my-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: opacity 0.2s ease;
}

.my-list.is-loading {
  opacity: 0.56;
  pointer-events: none;
}

.my-note {
  display: flex;
  align-items: stretch;
  gap: 20px;
  padding: 22px 24px;
}

.my-note__main {
  flex: 1;
  min-width: 0;
}

.my-note__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}

.my-note__title {
  display: inline-block;
  margin-top: 8px;
}

.my-note__title h2 {
  color: var(--text);
  font-size: 18px;
  line-height: 1.45;
  letter-spacing: -0.015em;
}

.my-note__title:hover h2 {
  color: var(--primary);
}

.my-note__excerpt {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 7px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.my-note__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 10px;
  color: var(--muted-2);
  font-size: 11px;
}

.my-note__reject {
  margin-top: 12px;
}

.my-note__actions {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  width: 86px;
}

.my-note-skeleton {
  padding: 22px 24px;
}

.my-note-skeleton__tag {
  width: 88px;
  height: 22px;
}

.my-note-skeleton__title {
  width: 52%;
  height: 20px;
  margin-top: 14px;
}

.my-note-skeleton__line {
  width: 88%;
  height: 12px;
  margin-top: 12px;
}

.my-note-skeleton__line--short {
  width: 60%;
  margin-top: 8px;
}

@media (max-width: 680px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  .my-note {
    flex-direction: column;
    padding: 18px;
  }

  .my-note__actions {
    flex-direction: row;
    width: auto;
  }

  .my-note__actions .btn {
    flex: 1;
  }
}
</style>
