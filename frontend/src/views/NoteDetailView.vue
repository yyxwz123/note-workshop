<template>
  <div class="container detail-page">
    <div class="detail-topbar">
      <RouterLink to="/" class="back-link">
        <span aria-hidden="true">←</span> 返回首页
      </RouterLink>
      <div v-if="owner && detail" class="detail-topbar__actions">
        <RouterLink :to="`/notes/${note.id}/edit`" class="btn btn-outline btn-sm">编辑笔记</RouterLink>
        <button class="btn btn-danger btn-sm" type="button" :disabled="deleting" @click="removeNote">
          <span v-if="deleting" class="spinner spinner--dark"></span>
          删除
        </button>
      </div>
    </div>

    <div v-if="loading" class="detail-loading">
      <div class="card detail-loading__head">
        <div class="skeleton detail-loading__tag"></div>
        <div class="skeleton detail-loading__title"></div>
        <div class="skeleton detail-loading__meta"></div>
      </div>
      <div class="card detail-loading__body">
        <div v-for="index in 5" :key="index" class="skeleton detail-loading__line"></div>
      </div>
    </div>

    <div v-else-if="error" class="card">
      <EmptyState icon="!" title="笔记加载失败" :description="error">
        <button type="button" class="btn btn-primary" @click="load">重新加载</button>
        <RouterLink to="/" class="btn btn-outline">返回首页</RouterLink>
      </EmptyState>
    </div>

    <div v-else-if="detail" class="detail-layout">
      <article class="detail-main">
        <header class="card detail-head">
          <div class="detail-head__tags">
            <span class="tag">{{ note.bookName || '未分类' }}</span>
            <span v-if="note.isPublic === 0" class="badge badge-muted">私有笔记</span>
            <span
              v-else-if="owner"
              class="badge"
              :class="`badge-${statusMeta.tone}`"
            >
              {{ statusMeta.label }}
            </span>
          </div>

          <h1 class="detail-title">{{ note.title || '无标题笔记' }}</h1>

          <div class="detail-meta">
            <RouterLink
              v-if="note.userId"
              :to="`/users/${note.userId}`"
              class="detail-author"
            >
              <UserAvatar :src="note.authorAvatar" :name="note.authorName" :size="42" />
              <span class="detail-author__text">
                <strong>{{ note.authorName || '匿名作者' }}</strong>
                <small>{{ formatDate(note.createdAt) }}</small>
              </span>
            </RouterLink>
            <span v-else class="detail-author">
              <UserAvatar :name="note.authorName" :size="42" />
              <span class="detail-author__text">
                <strong>{{ note.authorName || '匿名作者' }}</strong>
                <small>{{ formatDate(note.createdAt) }}</small>
              </span>
            </span>

            <div class="detail-meta__stats">
              <span>♥ {{ note.likeCount || 0 }} 点赞</span>
              <span>💬 {{ note.commentCount || 0 }} 评论</span>
            </div>
          </div>

          <div v-if="owner && note.isPublic === 1 && note.status === 2" class="alert alert-warning detail-alert">
            <span class="alert__icon">!</span>
            <span>这篇公开笔记正在等待管理员审核，审核通过后才会出现在首页。</span>
          </div>
          <div v-if="owner && note.isPublic === 1 && note.status === 3" class="alert alert-error detail-alert">
            <span class="alert__icon">!</span>
            <span>公开笔记未通过审核：{{ note.rejectReason || '内容不符合公开规范' }}</span>
          </div>
          <div v-if="owner && note.isPublic === 1 && note.status === 0" class="alert alert-error detail-alert">
            <span class="alert__icon">!</span>
            <span>这篇笔记已被管理员下架，仅你自己可见。</span>
          </div>
          <div v-if="owner && note.isPublic === 0" class="alert alert-info detail-alert">
            <span class="alert__icon">i</span>
            <span>这是私有笔记，仅你自己可见，不会出现在首页。</span>
          </div>
        </header>

        <section class="card detail-body">
          <div class="prose detail-content">{{ note.content }}</div>

          <div v-if="images.length" class="detail-gallery">
            <button
              v-for="(image, index) in images"
              :key="`${image}-${index}`"
              type="button"
              class="detail-gallery__item"
              @click="openLightbox(index)"
            >
              <img :src="mediaUrl(image)" :alt="`${note.title} 配图 ${index + 1}`" loading="lazy" />
            </button>
          </div>

          <div v-if="canLike" class="detail-like-bar">
            <button
              type="button"
              class="like-button"
              :class="{ 'is-liked': liked }"
              :disabled="liking"
              @click="toggleLike"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
                  :fill="liked ? 'currentColor' : 'none'"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linejoin="round"
                />
              </svg>
              <span>{{ liked ? '已点赞' : '点赞' }}</span>
              <span class="like-button__count">{{ note.likeCount || 0 }}</span>
            </button>
            <span v-if="!loggedIn" class="detail-like-tip">登录后可以点赞和评论</span>
          </div>
        </section>

        <section v-if="detail.aiContent" class="card ai-block">
          <div class="ai-block__head">
            <span class="ai-block__badge">AI</span>
            <div>
              <h2>AI 辅助 · {{ aiTypeLabel(detail.aiType) }}</h2>
              <p>由 AI 根据这篇笔记生成，仅供参考</p>
            </div>
          </div>
          <div class="prose ai-block__content">{{ detail.aiContent }}</div>
        </section>

        <section class="card comments-card">
          <div class="comments-head">
            <div>
              <h2>评论与回复</h2>
              <p>{{ canComment ? `${commentTotal} 条讨论` : '该笔记暂不开放评论' }}</p>
            </div>
          </div>

          <template v-if="canComment">
            <div v-if="loggedIn" class="comment-form">
              <UserAvatar :src="currentUser.avatar" :name="currentUser.nickname || currentUser.username" :size="38" />
              <div class="comment-form__body">
                <textarea
                  v-model="commentContent"
                  class="textarea comment-form__input"
                  maxlength="500"
                  placeholder="写下你的想法，和作者一起聊聊这本书…"
                  :disabled="submittingComment"
                ></textarea>
                <div class="comment-form__foot">
                  <span class="form-hint">{{ commentContent.length }}/500</span>
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    :disabled="submittingComment || !commentContent.trim()"
                    @click="submitComment"
                  >
                    <span v-if="submittingComment" class="spinner"></span>
                    {{ submittingComment ? '发表中…' : '发表评论' }}
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="comment-login-tip">
              <span>登录后参与讨论，留下你的读书想法。</span>
              <RouterLink :to="loginLink" class="btn btn-primary btn-sm">去登录</RouterLink>
            </div>

            <div v-if="commentsLoading" class="comments-loading">
              <div v-for="index in 3" :key="index" class="comments-loading__row">
                <div class="skeleton comments-loading__avatar"></div>
                <div class="comments-loading__lines">
                  <div class="skeleton comments-loading__line"></div>
                  <div class="skeleton comments-loading__line comments-loading__line--short"></div>
                </div>
              </div>
            </div>

            <div v-else-if="commentsError" class="alert alert-error comments-alert">
              <span class="alert__icon">!</span>
              <span>{{ commentsError }}</span>
              <button type="button" class="link" @click="loadComments">重试</button>
            </div>

            <div v-else-if="commentTree.length" class="comment-list">
              <div v-for="root in commentTree" :key="root.id" class="comment">
                <UserAvatar :src="root.avatar" :name="root.nickname" :size="38" />
                <div class="comment__main">
                  <div class="comment__head">
                    <strong>{{ root.nickname || '匿名用户' }}</strong>
                    <span v-if="root.userId === note.userId" class="comment__author-badge">作者</span>
                    <span class="comment__time">{{ timeAgo(root.createdAt) }}</span>
                    <span class="comment__ops">
                      <button
                        v-if="loggedIn"
                        type="button"
                        class="comment__op"
                        @click="startReply(root, null)"
                      >
                        {{ isReplyingRoot(root) ? '取消回复' : '回复' }}
                      </button>
                      <button
                        v-if="canDelete(root)"
                        type="button"
                        class="comment__op comment__op--danger"
                        @click="removeComment(root)"
                      >
                        删除
                      </button>
                    </span>
                  </div>
                  <p class="comment__content">{{ root.content }}</p>

                  <div v-if="isReplyingRoot(root)" class="reply-form">
                    <textarea
                      v-model="replyContent"
                      class="textarea reply-form__input"
                      maxlength="500"
                      :placeholder="`回复 @${root.nickname}…`"
                    ></textarea>
                    <div class="reply-form__foot">
                      <span class="form-hint">{{ replyContent.length }}/500</span>
                      <button type="button" class="btn btn-ghost btn-sm" @click="cancelReply">取消</button>
                      <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        :disabled="submittingReply || !replyContent.trim()"
                        @click="submitReply(root)"
                      >
                        <span v-if="submittingReply" class="spinner"></span>
                        {{ submittingReply ? '发送中…' : '回复' }}
                      </button>
                    </div>
                  </div>

                  <div v-if="root.replies.length" class="comment__children">
                    <div v-for="child in root.replies" :key="child.id" class="comment comment--child">
                      <UserAvatar :src="child.avatar" :name="child.nickname" :size="30" />
                      <div class="comment__main">
                        <div class="comment__head">
                          <strong>{{ child.nickname || '匿名用户' }}</strong>
                          <span v-if="child.userId === note.userId" class="comment__author-badge">作者</span>
                          <span class="comment__time">{{ timeAgo(child.createdAt) }}</span>
                          <span class="comment__ops">
                            <button
                              v-if="loggedIn"
                              type="button"
                              class="comment__op"
                              @click="startReply(root, child)"
                            >
                              {{ isReplyingChild(root, child) ? '取消回复' : '回复' }}
                            </button>
                            <button
                              v-if="canDelete(child)"
                              type="button"
                              class="comment__op comment__op--danger"
                              @click="removeComment(child)"
                            >
                              删除
                            </button>
                          </span>
                        </div>
                        <p class="comment__content">{{ child.content }}</p>

                        <div v-if="isReplyingChild(root, child)" class="reply-form">
                          <textarea
                            v-model="replyContent"
                            class="textarea reply-form__input"
                            maxlength="500"
                            :placeholder="`回复 @${child.nickname}…`"
                          ></textarea>
                          <div class="reply-form__foot">
                            <span class="form-hint">{{ replyContent.length }}/500</span>
                            <button type="button" class="btn btn-ghost btn-sm" @click="cancelReply">取消</button>
                            <button
                              type="button"
                              class="btn btn-primary btn-sm"
                              :disabled="submittingReply || !replyContent.trim()"
                              @click="submitReply(root)"
                            >
                              <span v-if="submittingReply" class="spinner"></span>
                              {{ submittingReply ? '发送中…' : '回复' }}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <EmptyState
              v-else
              icon="💬"
              title="还没有评论"
              description="来写下第一条评论，和作者交流读书心得吧。"
            />
          </template>

          <div v-else class="alert alert-info">
            <span class="alert__icon">i</span>
            <span>只有审核通过且公开的笔记才开放评论。</span>
          </div>
        </section>
      </article>

      <aside class="detail-side">
        <div class="card detail-author-card">
          <UserAvatar :src="note.authorAvatar" :name="note.authorName" :size="68" />
          <h3>{{ note.authorName || '匿名作者' }}</h3>
          <p v-if="author && author.bio" class="detail-author-card__bio">{{ author.bio }}</p>
          <p v-else class="detail-author-card__bio">这个作者还没有填写简介。</p>

          <div v-if="author" class="detail-author-card__stats">
            <div>
              <strong>{{ author.fansCount || 0 }}</strong>
              <span>粉丝</span>
            </div>
            <div>
              <strong>{{ author.noteCount || 0 }}</strong>
              <span>公开笔记</span>
            </div>
          </div>

          <RouterLink
            v-if="note.userId"
            :to="`/users/${note.userId}`"
            class="btn btn-outline btn-block detail-author-card__btn"
          >
            查看作者主页
          </RouterLink>
        </div>

        <div class="card detail-info-card">
          <h3>笔记信息</h3>
          <dl class="detail-info-list">
            <div>
              <dt>所属书籍</dt>
              <dd>{{ note.bookName || '未分类' }}</dd>
            </div>
            <div>
              <dt>可见性</dt>
              <dd>{{ note.isPublic === 1 ? '公开' : '仅自己可见' }}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>{{ statusMeta.label }}</dd>
            </div>
            <div>
              <dt>发布时间</dt>
              <dd>{{ formatDate(note.createdAt) }}</dd>
            </div>
            <div v-if="note.updatedAt && note.updatedAt !== note.createdAt">
              <dt>更新时间</dt>
              <dd>{{ formatDate(note.updatedAt) }}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>

    <Transition name="fade">
      <div
        v-if="lightboxIndex !== null && images.length"
        class="lightbox"
        role="dialog"
        aria-label="查看配图"
        @click.self="closeLightbox"
      >
        <button type="button" class="lightbox__close" aria-label="关闭" @click="closeLightbox">×</button>
        <button
          v-if="images.length > 1"
          type="button"
          class="lightbox__nav lightbox__nav--prev"
          aria-label="上一张"
          @click.stop="stepLightbox(-1)"
        >
          ‹
        </button>
        <img class="lightbox__image" :src="mediaUrl(images[lightboxIndex])" alt="笔记配图" />
        <button
          v-if="images.length > 1"
          type="button"
          class="lightbox__nav lightbox__nav--next"
          aria-label="下一张"
          @click.stop="stepLightbox(1)"
        >
          ›
        </button>
        <span class="lightbox__counter">{{ lightboxIndex + 1 }} / {{ images.length }}</span>
      </div>
    </Transition>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import auth from '@/store/auth'
import { notifyError, notifySuccess } from '@/store/toast'
import UserAvatar from '@/components/UserAvatar.vue'
import EmptyState from '@/components/EmptyState.vue'
import {
  aiTypeLabel,
  countComments,
  flattenReplies,
  formatDate,
  mediaUrl,
  noteStatusMeta,
  timeAgo
} from '@/utils/format'

export default {
  name: 'NoteDetailView',
  components: { UserAvatar, EmptyState },
  setup() {
    const route = useRoute()
    const router = useRouter()

    const detail = ref(null)
    const loading = ref(true)
    const error = ref('')
    const author = ref(null)
    const deleting = ref(false)
    const liking = ref(false)

    const comments = ref([])
    const commentsLoading = ref(false)
    const commentsError = ref('')
    const commentContent = ref('')
    const submittingComment = ref(false)

    const replyTo = ref(null)
    const replyContent = ref('')
    const submittingReply = ref(false)

    const lightboxIndex = ref(null)

    const note = computed(() => (detail.value && detail.value.note) || {})
    const images = computed(() =>
      detail.value && Array.isArray(detail.value.images) ? detail.value.images : []
    )
    const liked = computed(() => Boolean(detail.value && detail.value.liked))
    const loggedIn = computed(() => auth.isLoggedIn())
    const currentUser = computed(() => auth.state.user || {})
    const owner = computed(
      () => Boolean(currentUser.value.id && note.value.userId === currentUser.value.id)
    )
    const canComment = computed(() => note.value.isPublic === 1 && note.value.status === 1)
    const canLike = computed(() => canComment.value)
    const statusMeta = computed(() => noteStatusMeta(note.value.status))
    const commentTotal = computed(() => countComments(comments.value))
    const commentTree = computed(() =>
      comments.value.map((root) => ({
        ...root,
        replies: flattenReplies(root.children)
      }))
    )
    const loginLink = computed(() => {
      const redirect = encodeURIComponent(route.fullPath)
      return `/login?redirect=${redirect}`
    })

    async function load() {
      loading.value = true
      error.value = ''
      detail.value = null
      author.value = null
      comments.value = []
      replyTo.value = null
      const id = route.params.id
      try {
        const endpoint = auth.isLoggedIn()
          ? `/api/notes/${id}`
          : `/api/public/notes/${id}`
        const data = await api.get(endpoint)
        detail.value = data
        if (data && data.note && data.note.userId) {
          loadAuthor(data.note.userId)
        }
        if (data && data.note && data.note.isPublic === 1) {
          loadComments()
        }
      } catch (err) {
        error.value = err.message || '笔记加载失败'
        notifyError(err)
      } finally {
        loading.value = false
      }
    }

    async function loadAuthor(userId) {
      try {
        author.value = await api.get(`/api/public/users/${userId}`)
      } catch (err) {
        author.value = null
      }
    }

    async function loadComments() {
      const id = route.params.id
      commentsLoading.value = true
      commentsError.value = ''
      try {
        const data = await api.get(`/api/public/notes/${id}/comments`)
        comments.value = Array.isArray(data) ? data : []
        if (detail.value && detail.value.note) {
          detail.value.note.commentCount = countComments(comments.value)
        }
      } catch (err) {
        commentsError.value = err.message || '评论加载失败'
      } finally {
        commentsLoading.value = false
      }
    }

    async function submitComment() {
      const content = commentContent.value.trim()
      if (!content) {
        notifyError('评论内容不能为空')
        return
      }
      if (content.length > 500) {
        notifyError('评论内容不能超过 500 个字符')
        return
      }
      submittingComment.value = true
      try {
        await api.post(`/api/notes/${route.params.id}/comments`, {
          content,
          parentId: null
        })
        commentContent.value = ''
        notifySuccess('评论发表成功')
        await loadComments()
      } catch (err) {
        notifyError(err)
      } finally {
        submittingComment.value = false
      }
    }

    function startReply(root, child) {
      if (isReplyingChild(root, child) || (!child && isReplyingRoot(root))) {
        cancelReply()
        return
      }
      replyTo.value = {
        rootId: root.id,
        targetId: child ? child.id : null,
        targetName: child ? child.nickname : root.nickname
      }
      replyContent.value = ''
    }

    function cancelReply() {
      replyTo.value = null
      replyContent.value = ''
    }

    function isReplyingRoot(root) {
      return Boolean(replyTo.value && replyTo.value.rootId === root.id && !replyTo.value.targetId)
    }

    function isReplyingChild(root, child) {
      return Boolean(
        replyTo.value && replyTo.value.rootId === root.id && replyTo.value.targetId === child.id
      )
    }

    async function submitReply(root) {
      const raw = replyContent.value.trim()
      if (!raw) {
        notifyError('回复内容不能为空')
        return
      }
      if (!replyTo.value) return
      const targetId = replyTo.value.targetId
      const targetName = replyTo.value.targetName
      const content = targetId ? `回复 @${targetName}：${raw}` : raw
      if (content.length > 500) {
        notifyError('回复内容不能超过 500 个字符')
        return
      }
      submittingReply.value = true
      try {
        await api.post(`/api/notes/${route.params.id}/comments`, {
          content,
          parentId: targetId || root.id
        })
        notifySuccess('回复成功')
        cancelReply()
        await loadComments()
      } catch (err) {
        notifyError(err)
      } finally {
        submittingReply.value = false
      }
    }

    function canDelete(comment) {
      if (!loggedIn.value || !comment) return false
      if (auth.isAdmin()) return true
      return comment.userId === currentUser.value.id
    }

    async function removeComment(comment) {
      if (!comment) return
      if (!window.confirm('确定删除这条评论吗？其下的回复也会一并删除。')) return
      try {
        if (auth.isAdmin()) {
          await api.delete(`/api/admin/comments/${comment.id}`)
        } else {
          await api.delete(`/api/comments/${comment.id}`)
        }
        notifySuccess('评论已删除')
        await loadComments()
      } catch (err) {
        notifyError(err)
      }
    }

    async function toggleLike() {
      if (!loggedIn.value) {
        router.push({ name: 'login', query: { redirect: route.fullPath } })
        return
      }
      liking.value = true
      try {
        const data = await api.post(`/api/notes/${route.params.id}/like`)
        if (detail.value) {
          detail.value.liked = Boolean(data && data.liked)
          if (detail.value.note) {
            detail.value.note.likeCount = Number(data && data.likeCount) || 0
          }
        }
        notifySuccess(detail.value && detail.value.liked ? '已点赞' : '已取消点赞')
      } catch (err) {
        notifyError(err)
      } finally {
        liking.value = false
      }
    }

    async function removeNote() {
      if (!detail.value) return
      if (!window.confirm('确定删除这篇笔记吗？删除后无法恢复。')) return
      deleting.value = true
      try {
        await api.delete(`/api/notes/${note.value.id}`)
        notifySuccess('笔记已删除')
        router.replace('/me')
      } catch (err) {
        notifyError(err)
      } finally {
        deleting.value = false
      }
    }

    function openLightbox(index) {
      lightboxIndex.value = index
    }

    function closeLightbox() {
      lightboxIndex.value = null
    }

    function stepLightbox(step) {
      if (lightboxIndex.value === null) return
      const length = images.value.length
      if (!length) return
      lightboxIndex.value = (lightboxIndex.value + step + length) % length
    }

    function handleKeydown(event) {
      if (lightboxIndex.value === null) return
      if (event.key === 'Escape') closeLightbox()
      if (event.key === 'ArrowLeft') stepLightbox(-1)
      if (event.key === 'ArrowRight') stepLightbox(1)
    }

    onMounted(() => {
      load()
      window.addEventListener('keydown', handleKeydown)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleKeydown)
    })

    return {
      detail,
      loading,
      error,
      author,
      deleting,
      liking,
      comments,
      commentsLoading,
      commentsError,
      commentContent,
      submittingComment,
      replyTo,
      replyContent,
      submittingReply,
      lightboxIndex,
      note,
      images,
      liked,
      loggedIn,
      currentUser,
      owner,
      canComment,
      canLike,
      statusMeta,
      commentTotal,
      commentTree,
      loginLink,
      load,
      loadComments,
      submitComment,
      startReply,
      cancelReply,
      isReplyingRoot,
      isReplyingChild,
      submitReply,
      canDelete,
      removeComment,
      toggleLike,
      removeNote,
      openLightbox,
      closeLightbox,
      stepLightbox,
      aiTypeLabel,
      formatDate,
      timeAgo,
      mediaUrl
    }
  }
}
</script>

<style scoped>
.detail-page {
  max-width: 1120px;
}

.detail-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
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

.detail-topbar__actions {
  display: flex;
  gap: 8px;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 290px;
  gap: 26px;
  align-items: start;
}

.detail-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.detail-head {
  padding: 32px 34px 28px;
}

.detail-head__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 14px;
}

.detail-title {
  color: var(--text);
  font-size: clamp(26px, 3.6vw, 36px);
  line-height: 1.35;
  letter-spacing: -0.035em;
  word-break: break-word;
}

.detail-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.detail-author {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.detail-author__text {
  min-width: 0;
}

.detail-author__text strong {
  display: block;
  overflow: hidden;
  color: var(--text-2);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-author__text small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
}

.detail-author:hover .detail-author__text strong {
  color: var(--primary);
}

.detail-meta__stats {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}

.detail-alert {
  margin-top: 18px;
}

.detail-body {
  padding: 34px;
}

.detail-content {
  min-height: 90px;
}

.detail-gallery {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 28px;
}

.detail-gallery__item {
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-2);
  cursor: zoom-in;
}

.detail-gallery__item img {
  width: 100%;
  max-height: 380px;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.detail-gallery__item:hover img {
  transform: scale(1.02);
}

.detail-like-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 30px;
  padding-top: 22px;
  border-top: 1px dashed var(--border);
}

.like-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 18px;
  border: 1px solid #f2c3c5;
  border-radius: 999px;
  background: #fff7f7;
  color: #d95358;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.16s ease;
}

.like-button:hover:not(:disabled) {
  border-color: #e9a0a3;
  background: #ffefef;
  transform: translateY(-1px);
}

.like-button.is-liked {
  border-color: #f0b4b7;
  background: var(--danger-soft);
  color: var(--danger);
}

.like-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.like-button__count {
  padding-left: 8px;
  border-left: 1px solid currentColor;
  font-size: 12px;
  opacity: 0.8;
}

.detail-like-tip {
  color: var(--muted);
  font-size: 12px;
}

.ai-block {
  padding: 28px 32px;
  border-color: #d8e4ff;
  background: linear-gradient(145deg, #f7faff, #f1f6ff 60%, #f8f5ff);
}

.ai-block__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}

.ai-block__badge {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(140deg, #4d7df8, #7a5cf0);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  box-shadow: 0 10px 18px -12px rgba(59, 110, 246, 0.9);
}

.ai-block h2 {
  font-size: 17px;
  letter-spacing: -0.01em;
}

.ai-block__head p {
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
}

.ai-block__content {
  font-size: 15px;
}

.comments-card {
  padding: 28px 32px 32px;
}

.comments-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.comments-head h2 {
  font-size: 19px;
  letter-spacing: -0.02em;
}

.comments-head p {
  margin-top: 3px;
  color: var(--muted);
  font-size: 12px;
}

.comment-form {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--border);
}

.comment-form__body {
  flex: 1;
  min-width: 0;
}

.comment-form__input {
  min-height: 94px;
}

.comment-form__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 9px;
}

.comment-login-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  margin-bottom: 18px;
  border: 1px dashed var(--border-strong);
  border-radius: 12px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 13px;
}

.comments-alert {
  margin-top: 20px;
}

.comments-loading {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 22px;
}

.comments-loading__row {
  display: flex;
  gap: 12px;
}

.comments-loading__avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
}

.comments-loading__lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comments-loading__line {
  height: 12px;
  width: 82%;
}

.comments-loading__line--short {
  width: 54%;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 22px;
  margin-top: 24px;
}

.comment {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.comment__main {
  flex: 1;
  min-width: 0;
}

.comment__head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.comment__head strong {
  color: var(--text-2);
  font-size: 13px;
}

.comment__author-badge {
  display: inline-flex;
  align-items: center;
  height: 19px;
  padding: 0 6px;
  border-radius: 5px;
  background: var(--primary-soft);
  color: var(--primary-700);
  font-size: 10px;
  font-weight: 700;
}

.comment__time {
  color: var(--muted-2);
  font-size: 11px;
}

.comment__ops {
  display: inline-flex;
  gap: 10px;
  margin-left: auto;
}

.comment__op {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 11px;
  cursor: pointer;
}

.comment__op:hover {
  color: var(--primary);
}

.comment__op--danger:hover {
  color: var(--danger);
}

.comment__content {
  margin-top: 5px;
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.comment__children {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 14px;
  padding: 14px 16px;
  border-left: 2px solid #dfe8fb;
  border-radius: 0 12px 12px 0;
  background: var(--surface-2);
}

.comment--child {
  gap: 10px;
}

.reply-form {
  margin-top: 12px;
}

.reply-form__input {
  min-height: 74px;
  background: #fff;
}

.reply-form__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.reply-form__foot .form-hint {
  margin-right: auto;
}

.detail-side {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 90px;
}

.detail-author-card {
  padding: 24px;
  text-align: center;
}

.detail-author-card h3 {
  margin-top: 12px;
  font-size: 17px;
  letter-spacing: -0.01em;
}

.detail-author-card__bio {
  margin-top: 7px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}

.detail-author-card__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 18px;
  padding: 14px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.detail-author-card__stats strong {
  display: block;
  font-size: 19px;
  line-height: 1.2;
}

.detail-author-card__stats span {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
}

.detail-author-card__btn {
  margin-top: 18px;
}

.detail-info-card {
  padding: 22px 24px;
}

.detail-info-card h3 {
  margin-bottom: 15px;
  font-size: 15px;
}

.detail-info-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
  margin: 0;
}

.detail-info-list > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  font-size: 12px;
}

.detail-info-list dt {
  flex: none;
  color: var(--muted);
}

.detail-info-list dd {
  margin: 0;
  color: var(--text-2);
  text-align: right;
  word-break: break-word;
}

.detail-loading {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-loading__head {
  padding: 32px 34px;
}

.detail-loading__tag {
  width: 72px;
  height: 24px;
}

.detail-loading__title {
  width: 72%;
  height: 34px;
  margin-top: 18px;
}

.detail-loading__meta {
  width: 46%;
  height: 16px;
  margin-top: 20px;
}

.detail-loading__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 34px;
}

.detail-loading__line {
  height: 14px;
  width: 100%;
}

.detail-loading__line:nth-child(3) {
  width: 88%;
}

.detail-loading__line:nth-child(5) {
  width: 62%;
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: rgba(10, 16, 30, 0.88);
  backdrop-filter: blur(4px);
}

.lightbox__image {
  max-width: min(1100px, 88vw);
  max-height: 84vh;
  border-radius: 10px;
  object-fit: contain;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
}

.lightbox__close {
  position: absolute;
  top: 22px;
  right: 26px;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.lightbox__nav {
  position: absolute;
  top: 50%;
  width: 46px;
  height: 46px;
  margin-top: -23px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 30px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.lightbox__nav:hover {
  background: rgba(255, 255, 255, 0.2);
}

.lightbox__nav--prev {
  left: 24px;
}

.lightbox__nav--next {
  right: 24px;
}

.lightbox__counter {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  letter-spacing: 0.06em;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 960px) {
  .detail-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .detail-side {
    position: static;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .detail-head,
  .detail-body,
  .comments-card {
    padding: 22px 20px;
  }

  .detail-side {
    grid-template-columns: minmax(0, 1fr);
  }

  .detail-gallery {
    grid-template-columns: minmax(0, 1fr);
  }

  .detail-meta {
    align-items: flex-start;
    flex-direction: column;
  }

  .comment__ops {
    margin-left: 0;
  }

  .comment__children {
    padding: 12px;
  }

  .lightbox {
    padding: 16px;
  }

  .lightbox__nav {
    width: 38px;
    height: 38px;
    margin-top: -19px;
    font-size: 24px;
  }

  .lightbox__nav--prev {
    left: 8px;
  }

  .lightbox__nav--next {
    right: 8px;
  }
}
</style>
