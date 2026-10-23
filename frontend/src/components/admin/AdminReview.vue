<template>
  <div class="admin-review">
    <div class="card review-summary">
      <div>
        <h2>待审核公开笔记</h2>
        <p>通过后笔记会出现在首页；驳回时请填写原因，方便作者修改。</p>
      </div>
      <span class="badge badge-warning">{{ total }} 篇待审核</span>
    </div>

    <div v-if="loading" class="review-list">
      <div v-for="index in 3" :key="index" class="card review-skeleton">
        <div class="skeleton review-skeleton__tag"></div>
        <div class="skeleton review-skeleton__title"></div>
        <div class="skeleton review-skeleton__line"></div>
        <div class="skeleton review-skeleton__line review-skeleton__line--short"></div>
        <div class="skeleton review-skeleton__actions"></div>
      </div>
    </div>

    <div v-else-if="error" class="card">
      <EmptyState icon="!" title="待审核列表加载失败" :description="error">
        <button type="button" class="btn btn-primary" @click="load">重新加载</button>
      </EmptyState>
    </div>

    <template v-else>
      <div v-if="notes.length" class="review-list">
        <article v-for="note in notes" :key="note.id" class="card review-card">
          <div class="review-card__head">
            <div class="review-card__meta">
              <span class="tag">{{ note.bookName || '未分类' }}</span>
              <span class="table-sub">作者 ID {{ note.userId }} · {{ formatDate(note.createdAt) }}</span>
            </div>
            <span class="badge badge-warning">待审核</span>
          </div>

          <h3 class="review-card__title">{{ note.title || '无标题笔记' }}</h3>
          <p class="review-card__excerpt">{{ excerpt(note.content, 260) }}</p>

          <div v-if="expandedId === note.id" class="review-card__full">
            <div class="prose">{{ note.content }}</div>
          </div>

          <div class="review-card__actions">
            <button type="button" class="btn btn-ghost btn-sm" @click="toggleExpand(note.id)">
              {{ expandedId === note.id ? '收起全文' : '查看全文' }}
            </button>
            <span class="review-card__spacer"></span>
            <button
              type="button"
              class="btn btn-danger btn-sm"
              :disabled="reviewingId === note.id"
              @click="openReject(note)"
            >
              驳回
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              :disabled="reviewingId === note.id"
              @click="approve(note)"
            >
              <span v-if="reviewingId === note.id" class="spinner"></span>
              {{ reviewingId === note.id ? '处理中…' : '通过审核' }}
            </button>
          </div>
        </article>
      </div>

      <div v-else class="card">
        <EmptyState
          icon="✓"
          title="没有待审核的笔记"
          description="所有公开笔记都处理完了，社区很干净。"
        />
      </div>

      <AppPagination :page="page" :size="size" :total="total" :disabled="loading" @change="changePage" />
    </template>

    <Transition name="fade">
      <div v-if="rejectTarget" class="modal-mask" @click.self="closeReject">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="reject-title">
          <h3 id="reject-title">驳回笔记</h3>
          <p class="modal__desc">
            即将驳回《{{ rejectTarget.title || '无标题笔记' }}》。原因会展示给作者，最多 200 字。
          </p>
          <div class="field">
            <label class="label" for="reject-reason">
              驳回原因
              <span class="form-hint">{{ rejectReason.length }}/200</span>
            </label>
            <textarea
              id="reject-reason"
              v-model="rejectReason"
              class="textarea"
              maxlength="200"
              placeholder="例如：内容过于简单，请补充完整的读书心得后再提交。"
              :disabled="rejecting"
            ></textarea>
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn-ghost" :disabled="rejecting" @click="closeReject">
              取消
            </button>
            <button type="button" class="btn btn-danger" :disabled="rejecting" @click="submitReject">
              <span v-if="rejecting" class="spinner"></span>
              {{ rejecting ? '提交中…' : '确认驳回' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { onMounted, ref } from 'vue'
import api from '@/api'
import { notifyError, notifySuccess } from '@/store/toast'
import AppPagination from '@/components/AppPagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { excerpt, formatDate } from '@/utils/format'

const PAGE_SIZE = 6

export default {
  name: 'AdminReview',
  components: { AppPagination, EmptyState },
  setup() {
    const notes = ref([])
    const total = ref(0)
    const page = ref(1)
    const size = PAGE_SIZE
    const loading = ref(true)
    const error = ref('')
    const reviewingId = ref(null)
    const expandedId = ref(null)

    const rejectTarget = ref(null)
    const rejectReason = ref('')
    const rejecting = ref(false)

    let seed = 0

    async function load() {
      const current = ++seed
      loading.value = true
      error.value = ''
      try {
        const data = await api.get('/api/admin/notes/pending', {
          params: { page: page.value, size: PAGE_SIZE }
        })
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
        error.value = err.message || '待审核列表加载失败'
        notes.value = []
        total.value = 0
        notifyError(err)
      } finally {
        if (current === seed) loading.value = false
      }
    }

    function changePage(next) {
      page.value = next
      expandedId.value = null
      load()
    }

    function toggleExpand(id) {
      expandedId.value = expandedId.value === id ? null : id
    }

    async function afterReview() {
      if (notes.value.length === 1 && page.value > 1) {
        page.value -= 1
      }
      expandedId.value = null
      await load()
    }

    async function approve(note) {
      if (!note) return
      if (!window.confirm(`确定通过《${note.title || '无标题笔记'}》的审核吗？`)) return
      reviewingId.value = note.id
      try {
        await api.post(`/api/admin/notes/${note.id}/review`, {
          approved: true,
          reason: ''
        })
        notifySuccess('审核已通过，笔记已发布到首页')
        await afterReview()
      } catch (err) {
        notifyError(err)
      } finally {
        reviewingId.value = null
      }
    }

    function openReject(note) {
      rejectTarget.value = note
      rejectReason.value = ''
    }

    function closeReject() {
      if (rejecting.value) return
      rejectTarget.value = null
      rejectReason.value = ''
    }

    async function submitReject() {
      if (!rejectTarget.value) return
      rejecting.value = true
      try {
        await api.post(`/api/admin/notes/${rejectTarget.value.id}/review`, {
          approved: false,
          reason: rejectReason.value.trim()
        })
        notifySuccess('已驳回该笔记')
        rejectTarget.value = null
        rejectReason.value = ''
        await afterReview()
      } catch (err) {
        notifyError(err)
      } finally {
        rejecting.value = false
      }
    }

    onMounted(load)

    return {
      notes,
      total,
      page,
      size,
      loading,
      error,
      reviewingId,
      expandedId,
      rejectTarget,
      rejectReason,
      rejecting,
      load,
      changePage,
      toggleExpand,
      approve,
      openReject,
      closeReject,
      submitReject,
      excerpt,
      formatDate
    }
  }
}
</script>

<style scoped>
.admin-review {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
}

.review-summary h2 {
  font-size: 17px;
  letter-spacing: -0.01em;
}

.review-summary p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.review-card {
  padding: 22px 24px;
}

.review-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.review-card__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
}

.review-card__title {
  margin-top: 12px;
  font-size: 19px;
  line-height: 1.45;
  letter-spacing: -0.02em;
}

.review-card__excerpt {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 7px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.75;
  white-space: pre-wrap;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.review-card__full {
  margin-top: 14px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface-2);
}

.review-card__full .prose {
  font-size: 13px;
}

.review-card__actions {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed var(--border);
}

.review-card__spacer {
  flex: 1;
}

.review-skeleton {
  padding: 22px 24px;
}

.review-skeleton__tag {
  width: 90px;
  height: 22px;
}

.review-skeleton__title {
  width: 48%;
  height: 22px;
  margin-top: 14px;
}

.review-skeleton__line {
  width: 90%;
  height: 12px;
  margin-top: 12px;
}

.review-skeleton__line--short {
  width: 66%;
  margin-top: 8px;
}

.review-skeleton__actions {
  width: 200px;
  height: 32px;
  margin-top: 18px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 620px) {
  .review-card {
    padding: 18px;
  }

  .review-card__actions {
    flex-wrap: wrap;
  }

  .review-card__spacer {
    display: none;
  }
}
</style>
