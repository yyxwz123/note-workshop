<template>
  <div class="container profile-page">
    <div class="page-head">
      <div>
        <span class="eyebrow">MY PROFILE</span>
        <h1>个人资料</h1>
        <p>完善资料，让别人更容易认识你。</p>
      </div>
      <RouterLink to="/me" class="btn btn-outline">我的笔记</RouterLink>
    </div>

    <div v-if="loading" class="card profile-loading">
      <div class="skeleton profile-loading__avatar"></div>
      <div class="skeleton profile-loading__line"></div>
      <div class="skeleton profile-loading__line profile-loading__line--short"></div>
    </div>

    <div v-else-if="error" class="card">
      <EmptyState icon="!" title="个人资料加载失败" :description="error">
        <button type="button" class="btn btn-primary" @click="loadProfile">重新加载</button>
        <RouterLink to="/" class="btn btn-outline">返回首页</RouterLink>
      </EmptyState>
    </div>

    <div v-else-if="user" class="profile-layout">
      <aside class="profile-side">
        <div class="card profile-card">
          <div class="profile-card__cover"></div>
          <div class="profile-card__avatar">
            <UserAvatar :src="form.avatar" :name="form.nickname || user.username" :size="88" />
          </div>
          <h2>{{ form.nickname || user.username }}</h2>
          <p class="profile-card__username">@{{ user.username }}</p>
          <span v-if="isAdmin" class="badge badge-primary profile-card__role">管理员</span>
          <p class="profile-card__bio">{{ form.bio || '还没有填写简介，介绍一下自己吧。' }}</p>

          <div class="profile-stats">
            <button
              type="button"
              class="profile-stat"
              :class="{ 'is-active': activeList === 'followers' }"
              @click="selectList('followers')"
            >
              <strong>{{ counts.followers }}</strong>
              <span>粉丝</span>
            </button>
            <span class="profile-stats__divider"></span>
            <button
              type="button"
              class="profile-stat"
              :class="{ 'is-active': activeList === 'following' }"
              @click="selectList('following')"
            >
              <strong>{{ counts.following }}</strong>
              <span>关注</span>
            </button>
          </div>
        </div>

        <div class="card people-card">
          <div class="people-card__head">
            <h3>{{ activeList === 'followers' ? '我的粉丝' : '我关注的人' }}</h3>
            <button type="button" class="link people-card__refresh" @click="loadPeople(activeList)">
              刷新
            </button>
          </div>

          <div v-if="peopleLoading" class="people-loading">
            <div v-for="index in 3" :key="index" class="people-loading__row">
              <div class="skeleton people-loading__avatar"></div>
              <div class="skeleton people-loading__line"></div>
            </div>
          </div>

          <div v-else-if="peopleError" class="side-error">
            <span>{{ peopleError }}</span>
            <button type="button" class="link" @click="loadPeople(activeList)">重试</button>
          </div>

          <ul v-else-if="people.length" class="people-list">
            <li v-for="person in people" :key="person.id">
              <RouterLink :to="`/users/${person.id}`" class="people-item">
                <UserAvatar :src="person.avatar" :name="person.nickname || person.username" :size="36" />
                <span class="people-item__info">
                  <strong>{{ person.nickname || person.username }}</strong>
                  <small>{{ person.bio || '这个人很神秘，还没有写简介。' }}</small>
                </span>
              </RouterLink>
            </li>
          </ul>

          <div v-else class="people-empty">
            {{ activeList === 'followers' ? '还没有粉丝，公开笔记会帮你遇见读者。' : '还没有关注任何人，去首页认识一些作者吧。' }}
          </div>

          <p v-if="peopleTotal > people.length" class="people-card__hint">
            仅展示前 {{ people.length }} 位，共 {{ peopleTotal }} 位
          </p>
        </div>
      </aside>

      <section class="profile-main">
        <div class="card profile-form-card">
          <div class="profile-form-card__head">
            <div>
              <h2>编辑资料</h2>
              <p>昵称、简介和头像会展示在你的公开作者主页上</p>
            </div>
          </div>

          <div v-if="saveError" class="alert alert-error profile-alert">
            <span class="alert__icon">!</span>
            <span>{{ saveError }}</span>
          </div>
          <div v-if="saved" class="alert alert-success profile-alert">
            <span class="alert__icon">✓</span>
            <span>个人资料已保存。</span>
          </div>

          <div class="field">
            <label class="label" for="profile-username">用户名</label>
            <input id="profile-username" class="input" :value="user.username" disabled />
            <span class="form-hint">用户名用于登录，暂不支持修改。</span>
          </div>

          <div class="field">
            <label class="label" for="profile-nickname">
              昵称
              <span class="form-hint">{{ form.nickname.length }}/32</span>
            </label>
            <input
              id="profile-nickname"
              v-model.trim="form.nickname"
              class="input"
              type="text"
              maxlength="32"
              placeholder="你希望别人怎么称呼你？"
              :disabled="saving"
            />
          </div>

          <div class="field">
            <label class="label" for="profile-bio">
              简介
              <span class="form-hint">{{ form.bio.length }}/200</span>
            </label>
            <textarea
              id="profile-bio"
              v-model="form.bio"
              class="textarea profile-bio"
              maxlength="200"
              placeholder="介绍一下你自己，例如：喜欢科幻与随笔，正在读《置身事内》。"
              :disabled="saving"
            ></textarea>
          </div>

          <div class="field">
            <label class="label">头像</label>
            <div class="avatar-editor">
              <UserAvatar :src="form.avatar" :name="form.nickname || user.username" :size="72" />
              <div class="avatar-editor__actions">
                <label class="btn btn-outline btn-sm" :class="{ 'is-disabled': uploadingAvatar }">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    hidden
                    :disabled="uploadingAvatar || saving"
                    @change="onAvatarChange"
                  />
                  <span v-if="uploadingAvatar" class="spinner spinner--dark"></span>
                  {{ uploadingAvatar ? '上传中…' : '上传新头像' }}
                </label>
                <button
                  v-if="form.avatar"
                  type="button"
                  class="btn btn-ghost btn-sm"
                  :disabled="saving"
                  @click="form.avatar = ''"
                >
                  移除
                </button>
                <span class="form-hint">支持 JPG / PNG / GIF / WebP，不超过 10MB</span>
              </div>
            </div>
            <input
              v-model.trim="form.avatar"
              class="input avatar-url"
              type="text"
              placeholder="也可以直接填写头像地址，例如 /uploads/xxx.png"
              :disabled="saving"
            />
          </div>

          <div class="profile-form__foot">
            <button type="button" class="btn btn-primary" :disabled="saving" @click="saveProfile">
              <span v-if="saving" class="spinner"></span>
              {{ saving ? '保存中…' : '保存资料' }}
            </button>
            <button type="button" class="btn btn-ghost" :disabled="saving" @click="resetForm">
              重置
            </button>
            <span v-if="savedAt" class="form-hint">上次保存：{{ savedAt }}</span>
          </div>
        </div>

        <div class="card profile-home-card">
          <div>
            <h3>我的公开主页</h3>
            <p>其他人看到的作者主页，包含你的公开笔记、粉丝数和关注按钮。</p>
          </div>
          <RouterLink :to="`/users/${user.id}`" class="btn btn-outline">查看公开主页</RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, reactive, ref } from 'vue'
import api, { uploadFile } from '@/api'
import auth from '@/store/auth'
import { notifyError, notifySuccess } from '@/store/toast'
import UserAvatar from '@/components/UserAvatar.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatDate } from '@/utils/format'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024

export default {
  name: 'ProfileView',
  components: { UserAvatar, EmptyState },
  setup() {
    const user = ref(null)
    const loading = ref(true)
    const error = ref('')
    const saving = ref(false)
    const saveError = ref('')
    const saved = ref(false)
    const savedAt = ref('')

    const uploadingAvatar = ref(false)

    const form = reactive({ nickname: '', bio: '', avatar: '' })
    const counts = reactive({ followers: 0, following: 0 })
    const activeList = ref('followers')
    const people = ref([])
    const peopleTotal = ref(0)
    const peopleLoading = ref(false)
    const peopleError = ref('')

    const isAdmin = computed(() => Boolean(user.value && user.value.role === 'ADMIN'))

    function fillForm(data) {
      form.nickname = data.nickname || ''
      form.bio = data.bio || ''
      form.avatar = data.avatar || ''
    }

    async function loadProfile() {
      loading.value = true
      error.value = ''
      try {
        const data = await api.get('/api/users/me')
        user.value = data
        fillForm(data)
        saved.value = false
        await Promise.all([loadCounts(data.id), loadPeople(activeList.value, data.id)])
      } catch (err) {
        error.value = err.message || '个人资料加载失败'
        notifyError(err)
      } finally {
        loading.value = false
      }
    }

    async function loadCounts(userId) {
      try {
        const [followers, following] = await Promise.all([
          api.get(`/api/users/${userId}/followers`, { params: { page: 1, size: 1 } }),
          api.get(`/api/users/${userId}/following`, { params: { page: 1, size: 1 } })
        ])
        counts.followers = Number(followers && followers.total) || 0
        counts.following = Number(following && following.total) || 0
      } catch (err) {
        notifyError(err)
      }
    }

    async function loadPeople(kind = activeList.value, userId = null) {
      const id = userId || (user.value && user.value.id)
      if (!id) return
      peopleLoading.value = true
      peopleError.value = ''
      try {
        const data = await api.get(`/api/users/${id}/${kind}`, {
          params: { page: 1, size: 10 }
        })
        people.value = Array.isArray(data.records) ? data.records : []
        peopleTotal.value = Number(data.total) || 0
      } catch (err) {
        peopleError.value = err.message || '列表加载失败'
      } finally {
        peopleLoading.value = false
      }
    }

    function selectList(kind) {
      if (kind === activeList.value && people.value.length) return
      activeList.value = kind
      loadPeople(kind)
    }

    function resetForm() {
      if (!user.value) return
      fillForm(user.value)
      saveError.value = ''
      saved.value = false
    }

    async function onAvatarChange(event) {
      const input = event.target
      const file = input.files && input.files[0]
      input.value = ''
      if (!file) return
      if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) {
        const message = '头像仅支持 JPG / PNG / GIF / WebP，且不超过 10MB'
        saveError.value = message
        notifyError(message)
        return
      }
      uploadingAvatar.value = true
      saveError.value = ''
      try {
        const data = await uploadFile(file)
        if (!data || !data.url) throw new Error('上传成功但未返回图片地址')
        form.avatar = data.url
        notifySuccess('头像上传成功，点击「保存资料」后生效')
      } catch (err) {
        saveError.value = err.message || '头像上传失败'
        notifyError(err)
      } finally {
        uploadingAvatar.value = false
      }
    }

    async function saveProfile() {
      saveError.value = ''
      saved.value = false
      if (form.nickname.length > 32) {
        saveError.value = '昵称不能超过 32 个字符'
        return
      }
      if (form.bio.length > 200) {
        saveError.value = '简介不能超过 200 个字符'
        return
      }
      saving.value = true
      try {
        const data = await api.put('/api/users/me', {
          nickname: form.nickname.trim(),
          bio: form.bio.trim(),
          avatar: form.avatar.trim()
        })
        user.value = data
        fillForm(data)
        auth.setUser(data)
        saved.value = true
        savedAt.value = formatDate(new Date().toISOString())
        notifySuccess('个人资料已保存')
      } catch (err) {
        saveError.value = err.message || '保存失败，请稍后重试'
        notifyError(err)
      } finally {
        saving.value = false
      }
    }

    onMounted(loadProfile)

    return {
      user,
      loading,
      error,
      saving,
      saveError,
      saved,
      savedAt,
      uploadingAvatar,
      form,
      counts,
      activeList,
      people,
      peopleTotal,
      peopleLoading,
      peopleError,
      isAdmin,
      loadProfile,
      loadPeople,
      selectList,
      resetForm,
      onAvatarChange,
      saveProfile
    }
  }
}
</script>

<style scoped>
.profile-page {
  max-width: 1040px;
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

.profile-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.profile-side {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.profile-card {
  position: relative;
  padding: 0 22px 22px;
  overflow: hidden;
  text-align: center;
}

.profile-card__cover {
  height: 86px;
  margin: 0 -22px;
  background: radial-gradient(circle at 20% 20%, #cfe0ff, transparent 55%),
    linear-gradient(130deg, #e8efff, #dce8ff 45%, #ede7ff);
}

.profile-card__avatar {
  display: flex;
  justify-content: center;
  margin-top: -44px;
}

.profile-card__avatar :deep(.avatar) {
  border: 4px solid #fff;
  box-shadow: 0 10px 24px -14px rgba(23, 32, 51, 0.5);
}

.profile-card h2 {
  margin-top: 10px;
  font-size: 20px;
  letter-spacing: -0.02em;
}

.profile-card__username {
  margin-top: 2px;
  color: var(--muted);
  font-size: 12px;
}

.profile-card__role {
  margin-top: 8px;
}

.profile-card__bio {
  margin-top: 12px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}

.profile-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 17px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.profile-stats__divider {
  width: 1px;
  height: 30px;
  background: var(--border);
}

.profile-stat {
  flex: 1;
  padding: 6px 4px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.profile-stat:hover,
.profile-stat.is-active {
  background: var(--primary-softer);
}

.profile-stat strong {
  display: block;
  color: var(--text);
  font-size: 20px;
  line-height: 1.2;
}

.profile-stat span {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
}

.people-card {
  padding: 20px;
}

.people-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.people-card__head h3 {
  font-size: 15px;
}

.people-card__refresh {
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 12px;
}

.people-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.people-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px;
  margin: 0 -7px;
  border-radius: 10px;
  transition: background-color 0.15s ease;
}

.people-item:hover {
  background: var(--surface-2);
}

.people-item__info {
  min-width: 0;
}

.people-item__info strong {
  display: block;
  overflow: hidden;
  color: var(--text-2);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.people-item__info small {
  display: block;
  overflow: hidden;
  margin-top: 1px;
  color: var(--muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.people-empty {
  padding: 14px 4px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
}

.people-card__hint {
  margin-top: 10px;
  color: var(--muted-2);
  font-size: 10px;
  text-align: center;
}

.people-loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.people-loading__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.people-loading__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.people-loading__line {
  flex: 1;
  height: 10px;
}

.side-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  border-radius: 9px;
  background: var(--danger-soft);
  color: #ad262b;
  font-size: 11px;
}

.side-error .link {
  flex: none;
  border: 0;
  background: transparent;
  padding: 0;
}

.profile-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-form-card {
  padding: 28px 30px;
}

.profile-form-card__head {
  margin-bottom: 22px;
}

.profile-form-card__head h2 {
  font-size: 19px;
  letter-spacing: -0.02em;
}

.profile-form-card__head p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

.profile-alert {
  margin-bottom: 18px;
}

.profile-bio {
  min-height: 120px;
}

.avatar-editor {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-2);
}

.avatar-editor__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.avatar-editor__actions .form-hint {
  flex-basis: 100%;
}

.is-disabled {
  opacity: 0.55;
  pointer-events: none;
}

.avatar-url {
  margin-top: 10px;
}

.profile-form__foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.profile-form__foot .form-hint {
  margin-left: auto;
}

.profile-home-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 26px;
}

.profile-home-card h3 {
  font-size: 16px;
}

.profile-home-card p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

.profile-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 48px;
}

.profile-loading__avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
}

.profile-loading__line {
  width: 40%;
  height: 14px;
}

.profile-loading__line--short {
  width: 24%;
}

@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 620px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .profile-form-card {
    padding: 22px 20px;
  }

  .profile-home-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
