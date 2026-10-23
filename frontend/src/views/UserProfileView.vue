<template>
  <div class="container author-page">
    <div class="author-topbar">
      <RouterLink to="/" class="back-link"><span aria-hidden="true">←</span> 返回首页</RouterLink>
    </div>

    <div v-if="loading" class="author-loading">
      <div class="card author-loading__hero">
        <div class="skeleton author-loading__avatar"></div>
        <div class="author-loading__lines">
          <div class="skeleton author-loading__title"></div>
          <div class="skeleton author-loading__line"></div>
          <div class="skeleton author-loading__line author-loading__line--short"></div>
        </div>
      </div>
      <div class="notes-grid">
        <div v-for="index in 3" :key="index" class="card author-loading__note">
          <div class="skeleton author-loading__note-cover"></div>
          <div class="skeleton author-loading__note-line"></div>
          <div class="skeleton author-loading__note-line author-loading__note-line--short"></div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="card">
      <EmptyState icon="!" title="作者主页加载失败" :description="error">
        <button type="button" class="btn btn-primary" @click="loadProfile">重新加载</button>
        <RouterLink to="/" class="btn btn-outline">返回首页</RouterLink>
      </EmptyState>
    </div>

    <template v-else-if="profile">
      <section class="card author-hero">
        <div class="author-hero__bg"></div>
        <div class="author-hero__body">
          <div class="author-hero__avatar">
            <UserAvatar :src="profile.avatar" :name="profile.nickname" :size="96" />
          </div>

          <div class="author-hero__info">
            <div class="author-hero__name">
              <h1>{{ profile.nickname || '匿名作者' }}</h1>
              <span v-if="isSelf" class="badge badge-primary">这是你</span>
            </div>
            <p class="author-hero__bio">{{ profile.bio || '这个作者还没有填写简介。' }}</p>

            <div class="author-hero__stats">
              <div class="author-stat">
                <strong>{{ profile.fansCount || 0 }}</strong>
                <span>粉丝</span>
              </div>
              <div class="author-stat">
                <strong>{{ profile.noteCount || 0 }}</strong>
                <span>公开笔记</span>
              </div>
              <div class="author-stat">
                <strong>{{ following ? '已关注' : '未关注' }}</strong>
                <span>关注状态</span>
              </div>
            </div>
          </div>

          <div class="author-hero__actions">
            <RouterLink v-if="isSelf" to="/profile" class="btn btn-outline">
              编辑我的资料
            </RouterLink>
            <button
              v-else
              type="button"
              class="btn"
              :class="following ? 'btn-outline' : 'btn-primary'"
              :disabled="followBusy"
              @click="toggleFollow"
            >
              <span v-if="followBusy" class="spinner" :class="{ 'spinner--dark': following }"></span>
              {{ following ? '已关注 · 取消关注' : loggedIn ? '关注作者' : '登录后关注' }}
            </button>
          </div>
        </div>
      </section>

      <section class="author-notes">
        <div class="section-head">
          <div>
            <h2>TA 的公开笔记</h2>
            <p>共 {{ total }} 篇公开笔记，持续更新中</p>
          </div>
          <RouterLink v-if="isSelf" to="/notes/new" class="btn btn-primary btn-sm">
            ＋ 发布笔记
          </RouterLink>
        </div>

        <div v-if="notesLoading && !notes.length" class="notes-grid">
          <div v-for="index in 3" :key="index" class="skeleton-card card">
            <div class="skeleton skeleton-card__cover"></div>
            <div class="skeleton-card__body">
              <div class="skeleton skeleton-card__tag"></div>
              <div class="skeleton skeleton-card__title"></div>
              <div class="skeleton skeleton-card__text"></div>
            </div>
          </div>
        </div>

        <div v-else-if="notesError" class="alert alert-error author-notes__alert">
          <span class="alert__icon">!</span>
          <span>{{ notesError }}</span>
          <button type="button" class="link" @click="loadNotes">重试</button>
        </div>

        <template v-else>
          <div v-if="notes.length" class="notes-grid" :class="{ 'is-loading': notesLoading }">
            <NoteCard v-for="note in notes" :key="note.id" :note="note" />
          </div>
          <div v-else class="card">
            <EmptyState
              icon="书"
              title="还没有公开笔记"
              description="这位作者还没有发布公开笔记，过段时间再来看看吧。"
            >
              <RouterLink to="/" class="btn btn-outline">去首页逛逛</RouterLink>
            </EmptyState>
          </div>

          <AppPagination
            :page="page"
            :size="size"
            :total="total"
            :disabled="notesLoading"
            @change="changePage"
          />
        </template>
      </section>
    </template>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import auth from '@/store/auth'
import { notifyError, notifySuccess } from '@/store/toast'
import UserAvatar from '@/components/UserAvatar.vue'
import NoteCard from '@/components/NoteCard.vue'
import AppPagination from '@/components/AppPagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { hydrateNoteCovers } from '@/utils/hydrate'

const PAGE_SIZE = 6

export default {
  name: 'UserProfileView',
  components: { UserAvatar, NoteCard, AppPagination, EmptyState },
  setup() {
    const route = useRoute()
    const router = useRouter()

    const profile = ref(null)
    const loading = ref(true)
    const error = ref('')
    const following = ref(false)
    const followBusy = ref(false)

    const notes = ref([])
    const total = ref(0)
    const page = ref(1)
    const notesLoading = ref(true)
    const notesError = ref('')
    const size = PAGE_SIZE
    let notesSeed = 0

    const loggedIn = computed(() => auth.isLoggedIn())
    const isSelf = computed(() => {
      const user = auth.state.user
      return Boolean(user && profile.value && user.id === profile.value.id)
    })

    async function loadProfile() {
      loading.value = true
      error.value = ''
      try {
        const data = await api.get(`/api/public/users/${route.params.id}`)
        profile.value = data
        following.value = Boolean(data.followed)
        if (loggedIn.value && !isSelf.value) {
          checkFollowing(data.id)
        }
      } catch (err) {
        error.value = err.message || '作者信息加载失败'
        notifyError(err)
      } finally {
        loading.value = false
      }
    }

    /**
     * 公开作者接口的 followed 字段依赖当前用户，但后端公开接口未传当前用户。
     * 这里通过「我关注的人」列表补一次关注状态，失败时忽略。
     */
    async function checkFollowing(targetId) {
      try {
        const data = await api.get(
          `/api/users/${auth.state.user.id}/following`,
          { params: { page: 1, size: 200 } }
        )
        const records = Array.isArray(data.records) ? data.records : []
        if (records.some((item) => item.id === targetId)) {
          following.value = true
        }
      } catch (err) {
        // 关注状态修正失败不阻塞页面
      }
    }

    async function loadNotes() {
      const seed = ++notesSeed
      notesLoading.value = true
      notesError.value = ''
      try {
        const data = await api.get(`/api/public/users/${route.params.id}/notes`, {
          params: { page: page.value, size: PAGE_SIZE }
        })
        if (seed !== notesSeed) return
        notes.value = Array.isArray(data.records) ? data.records : []
        total.value = Number(data.total) || 0
        hydrateNoteCovers(notes.value, () => seed !== notesSeed)
      } catch (err) {
        if (seed !== notesSeed) return
        notesError.value = err.message || '笔记列表加载失败'
        notes.value = []
        total.value = 0
      } finally {
        if (seed === notesSeed) notesLoading.value = false
      }
    }

    function changePage(next) {
      page.value = next
      loadNotes()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    async function toggleFollow() {
      if (!loggedIn.value) {
        router.push({ name: 'login', query: { redirect: route.fullPath } })
        return
      }
      if (!profile.value || isSelf.value) return
      followBusy.value = true
      try {
        const data = following.value
          ? await api.delete(`/api/users/${profile.value.id}/follow`)
          : await api.post(`/api/users/${profile.value.id}/follow`)
        following.value = Boolean(data && data.followed)
        if (data && typeof data.fansCount !== 'undefined') {
          profile.value.fansCount = Number(data.fansCount) || 0
        }
        notifySuccess(following.value ? '已关注这位作者' : '已取消关注')
      } catch (err) {
        notifyError(err)
      } finally {
        followBusy.value = false
      }
    }

    onMounted(() => {
      loadProfile()
      loadNotes()
    })

    return {
      profile,
      loading,
      error,
      following,
      followBusy,
      notes,
      total,
      page,
      size,
      notesLoading,
      notesError,
      loggedIn,
      isSelf,
      loadProfile,
      loadNotes,
      changePage,
      toggleFollow
    }
  }
}
</script>

<style scoped>
.author-page {
  max-width: 1040px;
}

.author-topbar {
  margin-bottom: 16px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}

.back-link:hover {
  color: var(--primary);
}

.author-hero {
  position: relative;
  overflow: hidden;
  margin-bottom: 30px;
}

.author-hero__bg {
  height: 122px;
  background: radial-gradient(circle at 12% 20%, rgba(255, 255, 255, 0.7), transparent 50%),
    radial-gradient(circle at 90% 10%, #e4dbff, transparent 55%),
    linear-gradient(125deg, #dce8ff, #ecf2ff 55%, #e9e3ff);
}

.author-hero__body {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 22px;
  padding: 0 32px 28px;
}

.author-hero__avatar {
  flex: none;
  margin-top: -50px;
}

.author-hero__avatar :deep(.avatar) {
  border: 4px solid #fff;
  box-shadow: 0 14px 30px -18px rgba(23, 32, 51, 0.55);
}

.author-hero__info {
  flex: 1;
  min-width: 0;
  padding-top: 16px;
}

.author-hero__name {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
}

.author-hero__name h1 {
  font-size: 27px;
  letter-spacing: -0.035em;
}

.author-hero__bio {
  max-width: 620px;
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
}

.author-hero__stats {
  display: flex;
  align-items: center;
  gap: 32px;
  margin-top: 16px;
}

.author-stat strong {
  display: block;
  font-size: 17px;
  line-height: 1.2;
}

.author-stat span {
  display: block;
  margin-top: 1px;
  color: var(--muted);
  font-size: 11px;
}

.author-hero__actions {
  flex: none;
  padding-top: 20px;
}

.author-notes {
  min-width: 0;
}

.author-notes__alert {
  margin-bottom: 18px;
}

.notes-grid.is-loading {
  opacity: 0.55;
  pointer-events: none;
}

.author-loading {
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.author-loading__hero {
  display: flex;
  align-items: flex-end;
  gap: 22px;
  padding: 40px 32px 28px;
}

.author-loading__avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
}

.author-loading__lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.author-loading__title {
  width: 34%;
  height: 24px;
}

.author-loading__line {
  width: 56%;
  height: 12px;
}

.author-loading__line--short {
  width: 36%;
}

.author-loading__note {
  padding: 14px;
}

.author-loading__note-cover {
  aspect-ratio: 16 / 9;
  border-radius: 10px;
}

.author-loading__note-line {
  width: 84%;
  height: 12px;
  margin-top: 12px;
}

.author-loading__note-line--short {
  width: 52%;
}

@media (max-width: 760px) {
  .author-hero__body {
    flex-direction: column;
    align-items: flex-start;
    padding: 0 22px 24px;
  }

  .author-hero__avatar {
    margin-top: -44px;
  }

  .author-hero__info {
    padding-top: 0;
  }

  .author-hero__actions {
    padding-top: 0;
    width: 100%;
  }

  .author-hero__actions .btn {
    width: 100%;
  }

  .author-hero__stats {
    gap: 24px;
  }
}
</style>
