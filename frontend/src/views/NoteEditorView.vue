<template>
  <div class="container container--narrow editor-page">
    <div class="editor-head">
      <div>
        <span class="eyebrow">{{ isEdit ? 'EDIT NOTE' : 'NEW NOTE' }}</span>
        <h1>{{ isEdit ? '编辑笔记' : '发布笔记' }}</h1>
        <p>{{ isEdit ? '修改内容后保存，公开笔记会重新进入审核。' : '记录一本读过的书，和此刻的想法。' }}</p>
      </div>
      <RouterLink to="/me" class="btn btn-ghost">取消</RouterLink>
    </div>

    <div v-if="loadingNote" class="card editor-loading">
      <div class="skeleton editor-loading__line editor-loading__line--title"></div>
      <div class="skeleton editor-loading__line"></div>
      <div class="skeleton editor-loading__line editor-loading__line--block"></div>
      <div class="skeleton editor-loading__line editor-loading__line--block"></div>
    </div>

    <div v-else-if="loadError" class="card">
      <EmptyState icon="!" title="笔记无法编辑" :description="loadError">
        <RouterLink to="/me" class="btn btn-primary">返回我的笔记</RouterLink>
        <RouterLink to="/" class="btn btn-outline">返回首页</RouterLink>
      </EmptyState>
    </div>

    <form v-else class="editor-layout" @submit.prevent="submit">
      <div class="editor-main">
        <section class="card editor-card">
          <div class="editor-card__head">
            <div>
              <h2>基本信息</h2>
              <p>书名与标题会展示在笔记卡片上</p>
            </div>
          </div>

          <div class="field">
            <label class="label" for="note-book">
              书名
              <span class="form-hint">必填 · 最多 100 字</span>
            </label>
            <input
              id="note-book"
              v-model.trim="form.bookName"
              class="input"
              type="text"
              maxlength="100"
              placeholder="例如：深入理解计算机系统"
              :disabled="submitting"
            />
          </div>

          <div class="field">
            <label class="label" for="note-title">
              标题
              <span class="form-hint">必填 · 最多 100 字</span>
            </label>
            <input
              id="note-title"
              v-model.trim="form.title"
              class="input"
              type="text"
              maxlength="100"
              placeholder="这篇笔记想记录什么？"
              :disabled="submitting"
            />
          </div>

          <div class="field">
            <label class="label" for="note-content">
              正文
              <span class="form-hint">{{ form.content.length }} 字</span>
            </label>
            <textarea
              id="note-content"
              v-model="form.content"
              class="textarea editor-content"
              placeholder="写下书中的观点、你的思考，或者一段想记住的话…"
              :disabled="submitting"
            ></textarea>
          </div>
        </section>

        <section class="card editor-card">
          <div class="editor-card__head">
            <div>
              <h2>配图</h2>
              <p>支持 JPG / PNG / GIF / WebP，单张不超过 10MB，最多 9 张</p>
            </div>
            <span class="badge badge-primary">{{ form.images.length }} / 9</span>
          </div>

          <div class="upload-grid">
            <div v-for="(image, index) in form.images" :key="`${image}-${index}`" class="upload-item">
              <img :src="mediaUrl(image)" alt="笔记配图预览" />
              <span class="upload-item__index">{{ index + 1 }}</span>
              <button
                type="button"
                class="upload-item__remove"
                aria-label="移除这张图片"
                :disabled="submitting"
                @click="removeImage(index)"
              >
                ×
              </button>
            </div>

            <label v-if="form.images.length < 9" class="upload-add" :class="{ 'is-uploading': uploading }">
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                hidden
                :disabled="uploading || submitting"
                @change="onFilesChange"
              />
              <span class="upload-add__icon">{{ uploading ? '…' : '+' }}</span>
              <span class="upload-add__text">
                {{ uploading ? `上传中 ${uploadDone}/${uploadTotal}` : '添加图片' }}
              </span>
            </label>
          </div>

          <div v-if="uploadError" class="alert alert-error upload-alert">
            <span class="alert__icon">!</span>
            <span>{{ uploadError }}</span>
          </div>
        </section>

        <section class="card editor-card">
          <div class="editor-card__head">
            <div>
              <h2>可见性</h2>
              <p>公开笔记需审核通过后展示，私有笔记仅自己可见</p>
            </div>
          </div>

          <div class="visibility-grid">
            <label class="visibility-option" :class="{ 'is-active': form.isPublic === 1 }">
              <input v-model="form.isPublic" type="radio" :value="1" :disabled="submitting" />
              <span class="visibility-option__icon">🌐</span>
              <span class="visibility-option__text">
                <strong>公开笔记</strong>
                <small>提交后进入审核，通过后展示在首页</small>
              </span>
              <span class="visibility-option__dot"></span>
            </label>

            <label class="visibility-option" :class="{ 'is-active': form.isPublic === 0 }">
              <input v-model="form.isPublic" type="radio" :value="0" :disabled="submitting" />
              <span class="visibility-option__icon visibility-option__icon--muted">🔒</span>
              <span class="visibility-option__text">
                <strong>私有笔记</strong>
                <small>只有自己可以看到，不会进入审核</small>
              </span>
              <span class="visibility-option__dot"></span>
            </label>
          </div>

          <div v-if="form.isPublic === 1" class="alert alert-info visibility-alert">
            <span class="alert__icon">i</span>
            <span>
              {{ isEdit ? '保存后这篇公开笔记会重新进入审核，审核期间不会出现在首页。' : '公开笔记提交后会显示「已提交审核」，管理员通过后才会出现在首页。' }}
            </span>
          </div>
        </section>
      </div>

      <aside class="editor-side">
        <div class="card editor-publish">
          <h3>{{ isEdit ? '保存修改' : '发布笔记' }}</h3>
          <p>{{ form.isPublic === 1 ? '公开笔记需要审核，请耐心等待。' : '私有笔记保存后仅自己可见。' }}</p>

          <button class="btn btn-primary btn-lg btn-block" type="submit" :disabled="submitting">
            <span v-if="submitting" class="spinner"></span>
            {{ submitting ? '提交中…' : isEdit ? '保存修改' : '发布笔记' }}
          </button>
          <RouterLink to="/me" class="btn btn-outline btn-block editor-publish__back">返回我的笔记</RouterLink>

          <div v-if="submitError" class="alert alert-error editor-publish__error">
            <span class="alert__icon">!</span>
            <span>{{ submitError }}</span>
          </div>
        </div>

        <div v-if="rejectReason" class="alert alert-error reject-box">
          <span class="alert__icon">!</span>
          <span>
            <strong>上次审核被驳回：</strong>{{ rejectReason }}
          </span>
        </div>

        <div class="card editor-tips">
          <h4>写笔记的小建议</h4>
          <ul>
            <li>用一个具体的标题概括这篇笔记。</li>
            <li>摘录书中原句时，也写下自己的理解。</li>
            <li>配一张书页或封面截图，让笔记更生动。</li>
          </ul>
        </div>
      </aside>
    </form>
  </div>
</template>

<script>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { uploadFile } from '@/api'
import { notifyError, notifySuccess } from '@/store/toast'
import EmptyState from '@/components/EmptyState.vue'
import { mediaUrl } from '@/utils/format'

const MAX_IMAGES = 9
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export default {
  name: 'NoteEditorView',
  components: { EmptyState },
  setup() {
    const route = useRoute()
    const router = useRouter()

    const isEdit = computed(() => route.name === 'note-edit')
    const detail = ref(null)
    const loadingNote = ref(isEdit.value)
    const loadError = ref('')
    const submitting = ref(false)
    const submitError = ref('')

    const uploading = ref(false)
    const uploadTotal = ref(0)
    const uploadDone = ref(0)
    const uploadError = ref('')

    const form = reactive({
      bookName: '',
      title: '',
      content: '',
      isPublic: 0,
      images: []
    })

    const rejectReason = computed(() => {
      if (!detail.value || !detail.value.note) return ''
      return detail.value.note.rejectReason || ''
    })

    onMounted(async () => {
      if (!isEdit.value) {
        loadingNote.value = false
        return
      }
      try {
        const data = await api.get(`/api/notes/${route.params.id}`)
        detail.value = data
        const note = (data && data.note) || {}
        form.bookName = note.bookName || ''
        form.title = note.title || ''
        form.content = note.content || ''
        form.isPublic = note.isPublic === 1 ? 1 : 0
        form.images = Array.isArray(data && data.images) ? [...data.images] : []
      } catch (err) {
        loadError.value = err.message || '笔记加载失败'
        notifyError(err)
      } finally {
        loadingNote.value = false
      }
    })

    function removeImage(index) {
      form.images.splice(index, 1)
    }

    async function onFilesChange(event) {
      const input = event.target
      let files = Array.from(input.files || [])
      input.value = ''
      if (!files.length) return

      uploadError.value = ''

      const slots = MAX_IMAGES - form.images.length
      if (slots <= 0) {
        uploadError.value = `最多只能上传 ${MAX_IMAGES} 张图片`
        notifyError(uploadError.value)
        return
      }
      if (files.length > slots) {
        notifyError(`最多还能上传 ${slots} 张，已自动截取前 ${slots} 张`)
        files = files.slice(0, slots)
      }

      const invalid = files.find(
        (file) => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE
      )
      if (invalid) {
        uploadError.value = `“${invalid.name}”格式不支持或超过 10MB，仅支持 JPG / PNG / GIF / WebP`
        notifyError(uploadError.value)
        return
      }

      uploading.value = true
      uploadTotal.value = files.length
      uploadDone.value = 0
      try {
        for (const file of files) {
          const data = await uploadFile(file)
          if (!data || !data.url) {
            throw new Error('上传成功但未返回图片地址')
          }
          form.images.push(data.url)
          uploadDone.value += 1
        }
        notifySuccess(`成功上传 ${uploadDone.value} 张图片`)
      } catch (err) {
        uploadError.value = err.message || '图片上传失败'
        notifyError(err)
      } finally {
        uploading.value = false
        uploadTotal.value = 0
        uploadDone.value = 0
      }
    }

    function validate() {
      if (!form.bookName.trim()) return '请填写书名'
      if (form.bookName.trim().length > 100) return '书名不能超过 100 个字符'
      if (!form.title.trim()) return '请填写标题'
      if (form.title.trim().length > 100) return '标题不能超过 100 个字符'
      if (!form.content.trim()) return '正文不能为空'
      if (form.images.length > MAX_IMAGES) return `最多上传 ${MAX_IMAGES} 张图片`
      return ''
    }

    async function submit() {
      submitError.value = ''
      const message = validate()
      if (message) {
        submitError.value = message
        notifyError(message)
        return
      }

      submitting.value = true
      try {
        const payload = {
          bookName: form.bookName.trim(),
          title: form.title.trim(),
          content: form.content.trim(),
          isPublic: form.isPublic,
          images: [...form.images]
        }

        let data
        if (isEdit.value) {
          data = await api.put(`/api/notes/${route.params.id}`, payload)
        } else {
          data = await api.post('/api/notes', payload)
        }

        if (payload.isPublic === 1) {
          notifySuccess(
            isEdit.value ? '已保存，公开笔记已重新提交审核' : '已提交审核，审核通过后将在首页展示'
          )
        } else {
          notifySuccess(isEdit.value ? '笔记已保存' : '笔记已发布，仅自己可见')
        }

        const newId = data && data.note ? data.note.id : route.params.id
        if (!isEdit.value && payload.isPublic === 0 && newId) {
          router.replace(`/notes/${newId}`)
        } else {
          router.replace('/me')
        }
      } catch (err) {
        submitError.value = err.message || '保存失败，请稍后重试'
        notifyError(err)
      } finally {
        submitting.value = false
      }
    }

    return {
      isEdit,
      detail,
      loadingNote,
      loadError,
      submitting,
      submitError,
      uploading,
      uploadTotal,
      uploadDone,
      uploadError,
      form,
      rejectReason,
      removeImage,
      onFilesChange,
      submit,
      mediaUrl
    }
  }
}
</script>

<style scoped>
.editor-page {
  max-width: 980px;
}

.editor-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.editor-head h1 {
  margin-top: 12px;
  font-size: 30px;
  letter-spacing: -0.035em;
}

.editor-head p {
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
}

.editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 24px;
  align-items: start;
}

.editor-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.editor-card {
  padding: 26px 28px;
}

.editor-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.editor-card__head h2 {
  font-size: 17px;
  letter-spacing: -0.01em;
}

.editor-card__head p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

.editor-card :deep(.field:last-child) {
  margin-bottom: 0;
}

.editor-content {
  min-height: 300px;
  font-size: 15px;
  line-height: 1.9;
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.upload-item {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface-2);
}

.upload-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-item__index {
  position: absolute;
  bottom: 6px;
  left: 6px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.6);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}

.upload-item__remove {
  position: absolute;
  top: 6px;
  right: 6px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.62);
  color: #fff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.upload-item__remove:hover {
  background: var(--danger);
}

.upload-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  aspect-ratio: 1;
  border: 1px dashed var(--border-strong);
  border-radius: 11px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.upload-add:hover {
  border-color: var(--primary);
  background: var(--primary-softer);
  color: var(--primary);
}

.upload-add.is-uploading {
  cursor: wait;
  border-color: var(--primary);
  color: var(--primary);
}

.upload-add__icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  font-size: 18px;
  line-height: 1;
}

.upload-add__text {
  padding: 0 6px;
  text-align: center;
}

.upload-alert {
  margin-top: 16px;
}

.visibility-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.visibility-option {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.visibility-option:hover {
  border-color: #c6d7fb;
}

.visibility-option.is-active {
  border-color: var(--primary);
  background: var(--primary-softer);
  box-shadow: 0 0 0 3px rgba(59, 110, 246, 0.08);
}

.visibility-option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.visibility-option__icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--primary-soft);
  font-size: 16px;
}

.visibility-option__icon--muted {
  background: #eef1f7;
}

.visibility-option__text {
  min-width: 0;
  padding-right: 18px;
}

.visibility-option__text strong {
  display: block;
  color: var(--text-2);
  font-size: 13px;
}

.visibility-option__text small {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.55;
}

.visibility-option__dot {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 16px;
  height: 16px;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  background: #fff;
}

.visibility-option.is-active .visibility-option__dot {
  border: 5px solid var(--primary);
}

.visibility-alert {
  margin-top: 16px;
}

.editor-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 90px;
}

.editor-publish {
  padding: 22px;
}

.editor-publish h3 {
  font-size: 17px;
}

.editor-publish > p {
  margin: 6px 0 16px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

.editor-publish__back {
  margin-top: 9px;
}

.editor-publish__error {
  margin-top: 14px;
}

.reject-box {
  display: block;
}

.reject-box strong {
  display: block;
  margin-bottom: 3px;
}

.editor-tips {
  padding: 20px 22px;
}

.editor-tips h4 {
  font-size: 13px;
}

.editor-tips ul {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.editor-tips li {
  position: relative;
  padding-left: 14px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

.editor-tips li::before {
  content: '·';
  position: absolute;
  left: 2px;
  top: -1px;
  color: var(--primary);
  font-size: 18px;
  font-weight: 800;
}

.editor-loading {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 28px;
}

.editor-loading__line {
  width: 100%;
  height: 42px;
}

.editor-loading__line--title {
  width: 46%;
}

.editor-loading__line--block {
  height: 140px;
}

@media (max-width: 900px) {
  .editor-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .editor-side {
    position: static;
  }
}

@media (max-width: 620px) {
  .editor-head {
    flex-direction: column;
    gap: 12px;
  }

  .editor-card {
    padding: 20px;
  }

  .visibility-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .upload-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
