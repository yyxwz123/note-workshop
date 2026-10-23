<template>
  <div class="container home">
    <section class="hero">
      <div class="hero__content">
        <span class="eyebrow">READ · THINK · WRITE</span>
        <h1>把读过的书，<br /><span>写成自己的答案。</span></h1>
        <p class="hero__desc">
          在笔记工坊记录读书心得、书页截图与思考片段。公开你的笔记，遇见同样在读书的人；
          也可以把它留作只属于自己的阅读档案。
        </p>
        <div class="hero__actions">
          <template v-if="loggedIn">
            <RouterLink to="/notes/new" class="btn btn-primary btn-lg">开始写笔记</RouterLink>
            <RouterLink to="/me" class="btn btn-outline btn-lg">我的笔记</RouterLink>
          </template>
          <template v-else>
            <RouterLink to="/login" class="btn btn-primary btn-lg">登录开始记录</RouterLink>
            <RouterLink to="/register" class="btn btn-outline btn-lg">注册账号</RouterLink>
          </template>
        </div>
        <div class="hero__stats">
          <div class="hero__stat">
            <strong>{{ loading && total === 0 ? '—' : total }}</strong>
            <span>公开笔记</span>
          </div>
          <div class="hero__stat">
            <strong>{{ authors.length || '—' }}</strong>
            <span>热门作者</span>
          </div>
          <div class="hero__stat">
            <strong>3</strong>
            <span>AI 阅读场景</span>
          </div>
        </div>
      </div>

      <div class="hero__visual" aria-hidden="true">
        <div class="quote-card">
          <span class="quote-card__mark">“</span>
          <p>读书而不思考，等于吃饭而不消化。</p>
          <span class="quote-card__author">— 波尔克</span>
          <div class="quote-card__lines">
            <i></i><i></i><i></i>
          </div>
        </div>
        <div class="float-card float-card--top">
          <span class="float-card__icon">✎</span>
          <div>
            <strong>记录此刻</strong>
            <small>一句感想也值得保存</small>
          </div>
        </div>
        <div class="float-card float-card--bottom">
          <span class="float-card__icon float-card__icon--green">♥</span>
          <div>
            <strong>{{ total }} 篇公开笔记</strong>
            <small>正在被更多人读到</small>
          </div>
        </div>
      </div>
    </section>

    <div class="home-layout">
      <section id="feed" class="home-feed">
        <div class="section-head">
          <div>
            <h2>发现笔记</h2>
            <p>看看同学们最近在读什么、想了些什么</p>
          </div>
          <div class="sort-switch" role="tablist" aria-label="排序方式">
            <button
              type="button"
              class="sort-switch__item"
              :class="{ 'is-active': sort === 'latest' }"
              @click="changeSort('latest')"
            >
              最新
            </button>
            <button
              type="button"
              class="sort-switch__item"
              :class="{ 'is-active': sort === 'hot' }"
              @click="changeSort('hot')"
            >
              最热
            </button>
            <span v-if="loading && notes.length" class="spinner spinner--dark"></span>
          </div>
        </div>

        <div v-if="error" class="alert alert-error feed-alert">
          <span class="alert__icon">!</span>
          <div class="feed-alert__body">
            <span>{{ error }}</span>
            <button type="button" class="link feed-alert__retry" @click="loadNotes">重新加载</button>
          </div>
        </div>

        <div v-if="loading && !notes.length" class="notes-grid">
          <div v-for="index in 6" :key="index" class="skeleton-card card">
            <div class="skeleton skeleton-card__cover"></div>
            <div class="skeleton-card__body">
              <div class="skeleton skeleton-card__tag"></div>
              <div class="skeleton skeleton-card__title"></div>
              <div class="skeleton skeleton-card__title skeleton-card__title--short"></div>
              <div class="skeleton skeleton-card__text"></div>
              <div class="skeleton skeleton-card__text skeleton-card__text--short"></div>
            </div>
          </div>
        </div>

        <template v-else>
          <div v-if="notes.length" class="notes-grid">
            <NoteCard v-for="note in notes" :key="note.id" :note="note" />
          </div>
          <div v-else class="card">
            <EmptyState
              icon="书"
              title="还没有公开笔记"
              description="成为第一个分享读书笔记的人吧，公开笔记会经过管理员审核后展示在这里。"
            >
              <RouterLink v-if="loggedIn" to="/notes/new" class="btn btn-primary">
                写第一篇笔记
              </RouterLink>
              <RouterLink v-else to="/login" class="btn btn-primary">登录后发布</RouterLink>
            </EmptyState>
          </div>

          <AppPagination :page="page" :size="size" :total="total" :disabled="loading" @change="changePage" />
        </template>
      </section>

      <aside class="home-side">
        <div class="card side-card">
          <div class="side-card__head">
            <h3>热门作者</h3>
            <span class="side-card__en">TOP AUTHORS</span>
          </div>

          <div v-if="authorsLoading" class="author-skeleton">
            <div v-for="index in 4" :key="index" class="author-skeleton__row">
              <div class="skeleton author-skeleton__avatar"></div>
              <div class="author-skeleton__lines">
                <div class="skeleton author-skeleton__line"></div>
                <div class="skeleton author-skeleton__line author-skeleton__line--short"></div>
              </div>
            </div>
          </div>

          <div v-else-if="authorsError" class="side-error">
            <span>{{ authorsError }}</span>
            <button type="button" class="link" @click="loadAuthors">重试</button>
          </div>

          <ul v-else-if="authors.length" class="author-list">
            <li v-for="(author, index) in authors" :key="author.id">
              <RouterLink :to="`/users/${author.id}`" class="author-list__item">
                <span class="author-list__rank" :class="{ 'is-top': index < 3 }">{{ index + 1 }}</span>
                <UserAvatar :src="author.avatar" :name="author.nickname" :size="38" />
                <span class="author-list__info">
                  <strong>{{ author.nickname || '匿名作者' }}</strong>
                  <small>{{ author.fansCount || 0 }} 粉丝 · {{ author.noteCount || 0 }} 笔记</small>
                </span>
              </RouterLink>
            </li>
          </ul>

          <div v-else class="side-empty">还没有热门作者，去关注喜欢的作者吧。</div>
        </div>

        <div class="card side-card side-card--cta">
          <span class="side-card__en">START WRITING</span>
          <h3>今天读到哪一页？</h3>
          <p>把此刻的想法记下来，时间会替你把它变成礼物。</p>
          <RouterLink v-if="loggedIn" to="/notes/new" class="btn btn-primary btn-block">
            写一篇笔记
          </RouterLink>
          <RouterLink v-else to="/register" class="btn btn-primary btn-block">加入笔记工坊</RouterLink>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue'
import api from '@/api'
import auth from '@/store/auth'
import { notifyError } from '@/store/toast'
import NoteCard from '@/components/NoteCard.vue'
import AppPagination from '@/components/AppPagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { hydrateNoteCovers } from '@/utils/hydrate'

const PAGE_SIZE = 9

export default {
  name: 'HomeView',
  components: { NoteCard, AppPagination, EmptyState, UserAvatar },
  setup() {
    const notes = ref([])
    const total = ref(0)
    const page = ref(1)
    const sort = ref('latest')
    const loading = ref(true)
    const error = ref('')

    const authors = ref([])
    const authorsLoading = ref(true)
    const authorsError = ref('')

    const loggedIn = computed(() => auth.isLoggedIn())
    const size = PAGE_SIZE
    let requestSeed = 0

    async function loadNotes() {
      const seed = ++requestSeed
      loading.value = true
      error.value = ''
      try {
        const data = await api.get('/api/public/notes', {
          params: { page: page.value, size: PAGE_SIZE, sort: sort.value }
        })
        if (seed !== requestSeed) return
        notes.value = Array.isArray(data.records) ? data.records : []
        total.value = Number(data.total) || 0
        hydrateNoteCovers(notes.value, () => seed !== requestSeed)
      } catch (err) {
        if (seed !== requestSeed) return
        error.value = err.message || '笔记列表加载失败'
        notes.value = []
        total.value = 0
        notifyError(err)
      } finally {
        if (seed === requestSeed) loading.value = false
      }
    }

    async function loadAuthors() {
      authorsLoading.value = true
      authorsError.value = ''
      try {
        const data = await api.get('/api/public/authors/hot', { params: { limit: 6 } })
        authors.value = Array.isArray(data) ? data : []
      } catch (err) {
        authorsError.value = err.message || '热门作者加载失败'
      } finally {
        authorsLoading.value = false
      }
    }

    function changeSort(next) {
      if (sort.value === next) return
      sort.value = next
      page.value = 1
      loadNotes()
    }

    function changePage(next) {
      page.value = next
      loadNotes()
      const feed = document.getElementById('feed')
      if (feed) feed.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    onMounted(() => {
      loadNotes()
      loadAuthors()
    })

    return {
      notes,
      total,
      page,
      size,
      sort,
      loading,
      error,
      authors,
      authorsLoading,
      authorsError,
      loggedIn,
      loadNotes,
      loadAuthors,
      changeSort,
      changePage
    }
  }
}
</script>

<style scoped>
.home {
  padding-bottom: 10px;
}

.hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 40px;
  align-items: center;
  padding: 46px 48px;
  margin-bottom: 42px;
  border: 1px solid #dfe8fb;
  border-radius: 28px;
  background: radial-gradient(circle at 8% 0%, #eef4ff 0%, transparent 44%),
    radial-gradient(circle at 100% 100%, #f0ecff 0%, transparent 42%),
    linear-gradient(120deg, #ffffff 0%, #f8faff 60%, #f5f8ff 100%);
  overflow: hidden;
  box-shadow: var(--shadow);
}

.hero::after {
  content: '';
  position: absolute;
  top: -120px;
  right: -80px;
  width: 320px;
  height: 320px;
  border: 42px solid rgba(59, 110, 246, 0.05);
  border-radius: 50%;
  pointer-events: none;
}

.hero__content {
  position: relative;
  z-index: 1;
}

.hero h1 {
  margin-top: 16px;
  font-size: clamp(32px, 4.4vw, 48px);
  line-height: 1.2;
  letter-spacing: -0.035em;
}

.hero h1 span {
  background: linear-gradient(110deg, #3b6ef6, #7a5cf0);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero__desc {
  max-width: 560px;
  margin-top: 18px;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.85;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 26px;
}

.hero__stats {
  display: flex;
  gap: 38px;
  margin-top: 34px;
  padding-top: 24px;
  border-top: 1px solid #e4ebf8;
}

.hero__stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hero__stat strong {
  font-size: 25px;
  line-height: 1.2;
  letter-spacing: -0.03em;
}

.hero__stat span {
  color: var(--muted);
  font-size: 12px;
}

.hero__visual {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
}

.quote-card {
  position: relative;
  width: min(340px, 100%);
  padding: 30px 28px 26px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 26px 50px -30px rgba(44, 74, 145, 0.45);
  backdrop-filter: blur(8px);
  transform: rotate(-2deg);
}

.quote-card__mark {
  position: absolute;
  top: 10px;
  left: 20px;
  color: #d9e4ff;
  font-family: Georgia, serif;
  font-size: 64px;
  line-height: 1;
}

.quote-card p {
  position: relative;
  color: var(--text);
  font-size: 19px;
  font-weight: 600;
  line-height: 1.75;
  letter-spacing: -0.01em;
}

.quote-card__author {
  display: block;
  margin-top: 12px;
  color: var(--muted);
  font-size: 12px;
}

.quote-card__lines {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 22px;
}

.quote-card__lines i {
  display: block;
  height: 5px;
  border-radius: 3px;
  background: #e8eefb;
}

.quote-card__lines i:nth-child(2) {
  width: 82%;
}

.quote-card__lines i:nth-child(3) {
  width: 58%;
}

.float-card {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 34px -24px rgba(23, 32, 51, 0.45);
}

.float-card__icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 15px;
}

.float-card__icon--green {
  background: var(--danger-soft);
  color: #e06469;
}

.float-card strong {
  display: block;
  font-size: 12px;
  line-height: 1.3;
}

.float-card small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 10px;
}

.float-card--top {
  top: 14px;
  right: -6px;
}

.float-card--bottom {
  bottom: 8px;
  left: -8px;
}

.home-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 30px;
  align-items: start;
}

.home-feed {
  min-width: 0;
  scroll-margin-top: 86px;
}

.sort-switch {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface);
}

.sort-switch__item {
  height: 32px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sort-switch__item:hover {
  color: var(--text);
}

.sort-switch__item.is-active {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 7px 14px -9px rgba(59, 110, 246, 0.9);
}

.sort-switch .spinner {
  margin: 0 6px;
}

.feed-alert {
  margin-bottom: 18px;
}

.feed-alert__body {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.feed-alert__retry {
  border: 0;
  background: transparent;
  padding: 0;
}

.home-side {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 90px;
}

.side-card {
  padding: 20px;
}

.side-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.side-card__head h3,
.side-card h3 {
  font-size: 16px;
  letter-spacing: -0.01em;
}

.side-card__en {
  color: var(--muted-2);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.author-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.author-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  margin: 0 -8px;
  border-radius: 11px;
  transition: background-color 0.15s ease;
}

.author-list__item:hover {
  background: var(--surface-2);
}

.author-list__rank {
  flex: none;
  width: 18px;
  color: var(--muted-2);
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}

.author-list__rank.is-top {
  color: var(--primary);
}

.author-list__info {
  min-width: 0;
}

.author-list__info strong {
  display: block;
  overflow: hidden;
  color: var(--text-2);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-list__info small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
}

.side-empty {
  padding: 18px 6px;
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}

.side-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  background: var(--danger-soft);
  color: #ad262b;
  font-size: 12px;
}

.side-error .link {
  flex: none;
  border: 0;
  background: transparent;
  padding: 0;
}

.side-card--cta {
  border-color: #d8e4ff;
  background: linear-gradient(150deg, #f4f8ff, #eef3ff 55%, #f5f0ff);
}

.side-card--cta h3 {
  margin-top: 8px;
  font-size: 19px;
}

.side-card--cta p {
  margin: 8px 0 18px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}

.author-skeleton {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.author-skeleton__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.author-skeleton__avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
}

.author-skeleton__lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.author-skeleton__line {
  height: 10px;
  width: 72%;
}

.author-skeleton__line--short {
  width: 46%;
}

.skeleton-card {
  overflow: hidden;
}

.skeleton-card__cover {
  aspect-ratio: 16 / 9;
  border-radius: 0;
}

.skeleton-card__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
}

.skeleton-card__tag {
  width: 64px;
  height: 20px;
}

.skeleton-card__title {
  width: 88%;
  height: 17px;
}

.skeleton-card__title--short {
  width: 58%;
}

.skeleton-card__text {
  width: 100%;
  height: 12px;
}

.skeleton-card__text--short {
  width: 68%;
}

@media (max-width: 1040px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
    padding: 38px 34px;
  }

  .hero__visual {
    display: none;
  }

  .home-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .home-side {
    position: static;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .hero {
    padding: 30px 22px;
    margin-bottom: 30px;
    border-radius: 22px;
  }

  .hero__stats {
    gap: 22px;
  }

  .hero__stat strong {
    font-size: 21px;
  }

  .home-side {
    grid-template-columns: minmax(0, 1fr);
  }

  .sort-switch {
    align-self: stretch;
  }

  .sort-switch__item {
    flex: 1;
  }
}
</style>
