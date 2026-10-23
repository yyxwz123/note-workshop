<template>
  <article class="note-card">
    <RouterLink :to="`/notes/${note.id}`" class="note-card__cover" :aria-label="note.title">
      <img
        v-if="cover"
        :src="cover"
        :alt="note.title"
        loading="lazy"
        @error="coverFailed = true"
      />
      <span v-else class="note-card__fallback">
        <span>{{ bookInitial }}</span>
      </span>
      <span class="note-card__badges">
        <span v-if="showStatus" class="badge" :class="`badge-${statusMeta.tone}`">
          {{ statusMeta.label }}
        </span>
        <span v-if="note.isPublic === 0" class="badge badge-muted">私有</span>
      </span>
    </RouterLink>

    <div class="note-card__body">
      <div class="note-card__meta">
        <span class="tag">{{ note.bookName || '未分类' }}</span>
        <time class="note-card__time">{{ formatDate(note.createdAt) }}</time>
      </div>

      <RouterLink :to="`/notes/${note.id}`" class="note-card__title">
        <h3>{{ note.title || '无标题笔记' }}</h3>
      </RouterLink>

      <p class="note-card__excerpt">{{ excerpt(note.content, 105) }}</p>

      <div class="note-card__footer">
        <RouterLink
          v-if="note.userId"
          :to="`/users/${note.userId}`"
          class="note-card__author"
          @click.stop
        >
          <UserAvatar :src="note.authorAvatar" :name="note.authorName" :size="24" />
          <span>{{ note.authorName || '匿名作者' }}</span>
        </RouterLink>
        <span v-else class="note-card__author">
          <UserAvatar :name="note.authorName" :size="24" />
          <span>{{ note.authorName || '匿名作者' }}</span>
        </span>

        <span class="note-card__stats">
          <span class="note-card__stat" title="点赞数">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path
                d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
              />
            </svg>
            {{ note.likeCount || 0 }}
          </span>
          <span class="note-card__stat" title="评论数">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path
                d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.9 8.9 0 0 1-3.8-.8L3 21l1.9-5.2a8 8 0 0 1-1.4-4.5A8.4 8.4 0 0 1 12 3.2a8.4 8.4 0 0 1 9 8.3z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
              />
            </svg>
            {{ note.commentCount || 0 }}
          </span>
        </span>
      </div>
    </div>
  </article>
</template>

<script>
import { computed, ref, watch } from 'vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { excerpt, formatDate, mediaUrl, noteStatusMeta } from '@/utils/format'

export default {
  name: 'NoteCard',
  components: { UserAvatar },
  props: {
    note: { type: Object, required: true },
    showStatus: { type: Boolean, default: false }
  },
  setup(props) {
    const coverFailed = ref(false)
    const cover = computed(() => {
      if (coverFailed.value) return ''
      const images = props.note.images
      return Array.isArray(images) && images.length ? mediaUrl(images[0]) : ''
    })
    const bookInitial = computed(() => {
      const value = (props.note.bookName || props.note.title || '书').trim()
      return value.slice(0, 2)
    })
    const statusMeta = computed(() => noteStatusMeta(props.note.status))

    watch(
      () => props.note.images,
      () => {
        coverFailed.value = false
      }
    )

    return {
      coverFailed,
      cover,
      bookInitial,
      statusMeta,
      excerpt,
      formatDate
    }
  }
}
</script>

<style scoped>
.note-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.note-card:hover {
  transform: translateY(-3px);
  border-color: #d5e1f8;
  box-shadow: var(--shadow);
}

.note-card__cover {
  position: relative;
  display: block;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #e9effb;
}

.note-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.note-card:hover .note-card__cover img {
  transform: scale(1.035);
}

.note-card__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 25% 15%, rgba(255, 255, 255, 0.85), transparent 48%),
    linear-gradient(140deg, #dce8ff, #edf3ff 55%, #e6ddff);
}

.note-card__fallback::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(59, 110, 246, 0.22) 1px, transparent 1px);
  background-size: 18px 18px;
  opacity: 0.5;
}

.note-card__fallback span {
  position: relative;
  color: rgba(47, 94, 224, 0.55);
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.05em;
}

.note-card__badges {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 6px;
}

.note-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  padding: 16px 18px 18px;
}

.note-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.note-card__meta .tag {
  max-width: 62%;
}

.note-card__time {
  color: var(--muted-2);
  font-size: 12px;
  white-space: nowrap;
}

.note-card__title h3 {
  display: -webkit-box;
  overflow: hidden;
  color: var(--text);
  font-size: 17px;
  line-height: 1.5;
  letter-spacing: -0.01em;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.note-card__title:hover h3 {
  color: var(--primary);
}

.note-card__excerpt {
  display: -webkit-box;
  overflow: hidden;
  min-height: 44px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.note-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  padding-top: 11px;
  border-top: 1px dashed var(--border);
}

.note-card__author {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
}

.note-card__author:hover {
  color: var(--primary);
}

.note-card__author span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-card__stats {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
  color: var(--muted);
  font-size: 12px;
}

.note-card__stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
