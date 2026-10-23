<template>
  <div class="container ai-page">
    <div class="page-head">
      <div>
        <span class="eyebrow">AI ASSISTANT</span>
        <h1>AI 助手</h1>
        <p>让 AI 帮你总结笔记、找到合适的读者，或回答使用中的问题。</p>
      </div>
      <div class="ai-status-pill" :class="statusPillClass">
        <span class="ai-status-pill__dot"></span>
        {{ statusLabel }}
      </div>
    </div>

    <div v-if="showBanner" class="alert alert-warning ai-banner">
      <span class="alert__icon">!</span>
      <div class="ai-banner__body">
        <strong>AI 未配置，请设置 AI_API_KEY</strong>
        <p>{{ bannerDetail }}</p>
      </div>
      <button type="button" class="btn btn-outline btn-sm ai-banner__btn" @click="loadAiStatus">
        重新检测
      </button>
    </div>

    <div class="tabs ai-tabs" role="tablist" aria-label="AI 功能">
      <button
        type="button"
        class="tabs__item"
        :class="{ 'is-active': activeTab === 'read' }"
        @click="switchTab('read')"
      >
        阅读辅助
      </button>
      <button
        type="button"
        class="tabs__item"
        :class="{ 'is-active': activeTab === 'chat' }"
        @click="switchTab('chat')"
      >
        智能客服
      </button>
      <button
        type="button"
        class="tabs__item"
        :class="{ 'is-active': activeTab === 'status' }"
        @click="switchTab('status')"
      >
        AI 状态
      </button>
    </div>

    <!-- 阅读辅助 -->
    <section v-if="activeTab === 'read'" class="ai-read-grid">
      <div class="card ai-panel">
        <div class="ai-panel__head">
          <div>
            <h2>选择笔记</h2>
            <p>从你的笔记中选择一篇，让 AI 生成阅读辅助内容。</p>
          </div>
          <span class="badge badge-primary">{{ myNotes.length }} 篇</span>
        </div>

        <div v-if="notesLoading" class="ai-panel__loading">
          <div class="skeleton ai-panel__loading-select"></div>
          <div class="skeleton ai-panel__loading-type"></div>
          <div class="skeleton ai-panel__loading-btn"></div>
        </div>

        <div v-else-if="notesError" class="alert alert-error">
          <span class="alert__icon">!</span>
          <span>{{ notesError }}</span>
          <button type="button" class="link" @click="loadMyNotes">重试</button>
        </div>

        <EmptyState
          v-else-if="!myNotes.length"
          icon="书"
          title="还没有可用的笔记"
          description="先发布一篇笔记，AI 才能帮你生成总结、人群和评分。"
        >
          <RouterLink to="/notes/new" class="btn btn-primary">去写笔记</RouterLink>
        </EmptyState>

        <template v-else>
          <div class="field">
            <label class="label" for="ai-note-select">我的笔记</label>
            <select id="ai-note-select" v-model="selectedNoteId" class="select" :disabled="generating">
              <option v-for="note in myNotes" :key="note.id" :value="note.id">
                《{{ note.bookName || '未分类' }}》{{ note.title || '无标题笔记' }}
              </option>
            </select>
          </div>

          <div class="field">
            <label class="label">生成类型</label>
            <div class="type-grid">
              <button
                v-for="type in aiTypes"
                :key="type.value"
                type="button"
                class="type-card"
                :class="{ 'is-active': selectedType === type.value }"
                :disabled="generating"
                @click="chooseType(type.value)"
              >
                <span class="type-card__icon">{{ type.icon }}</span>
                <strong>{{ type.label }}</strong>
                <small>{{ type.desc }}</small>
              </button>
            </div>
          </div>

          <div v-if="existingAi && existingAi.content" class="existing-ai">
            <div class="existing-ai__head">
              <span>笔记中已保存的 AI 内容</span>
              <span class="badge badge-muted">{{ aiTypeLabel(existingAi.type) }}</span>
            </div>
            <p>{{ existingAi.content }}</p>
          </div>

          <button
            type="button"
            class="btn btn-primary btn-lg btn-block"
            :disabled="generating || !selectedNoteId"
            @click="generate"
          >
            <span v-if="generating" class="spinner"></span>
            {{ generating ? 'AI 正在阅读…' : '生成 AI 内容' }}
          </button>
          <p class="ai-panel__hint">生成结果不会自动修改笔记，需要点击「保存到笔记」后才会展示在详情页。</p>
        </template>
      </div>

      <div class="card ai-result">
        <div class="ai-result__head">
          <div>
            <h2>生成结果</h2>
            <p>{{ result ? aiTypeLabel(result.type) : '等待生成' }}</p>
          </div>
          <span v-if="result && result.saved" class="badge badge-success">已保存到笔记</span>
        </div>

        <div v-if="generating" class="ai-generating">
          <span class="ai-generating__orb"></span>
          <p>AI 正在阅读你的笔记，请稍候…</p>
          <div class="ai-generating__lines">
            <div class="skeleton"></div>
            <div class="skeleton"></div>
            <div class="skeleton"></div>
            <div class="skeleton"></div>
          </div>
        </div>

        <div v-else-if="readError" class="alert alert-warning ai-result__error">
          <span class="alert__icon">!</span>
          <div>
            <strong>{{ readError }}</strong>
            <p v-if="aiUnavailable" class="ai-result__error-tip">
              请在后端设置环境变量 AI_API_KEY（以及 AI_BASE_URL、AI_MODEL）后重启服务，再回来重试。
            </p>
          </div>
        </div>

        <div v-else-if="result" class="ai-result__body">
          <div class="prose ai-result__content">{{ result.content }}</div>
          <div class="ai-result__actions">
            <button
              type="button"
              class="btn btn-primary btn-sm"
              :disabled="savingResult || result.saved"
              @click="saveResult"
            >
              <span v-if="savingResult" class="spinner"></span>
              {{ result.saved ? '已保存到笔记' : savingResult ? '保存中…' : '保存到笔记' }}
            </button>
            <button type="button" class="btn btn-outline btn-sm" @click="copyResult">复制内容</button>
          </div>
        </div>

        <EmptyState
          v-else
          icon="✦"
          title="还没有生成内容"
          description="在左侧选择笔记和生成类型，点击「生成 AI 内容」开始。"
        />
      </div>
    </section>

    <!-- 智能客服 -->
    <section v-else-if="activeTab === 'chat'" class="ai-chat-layout">
      <aside class="card chat-sessions">
        <div class="chat-sessions__head">
          <h2>会话列表</h2>
          <button type="button" class="btn btn-primary btn-sm" @click="newSession">＋ 新建</button>
        </div>

        <div v-if="sessionsLoading" class="chat-sessions__loading">
          <div v-for="index in 3" :key="index" class="skeleton chat-sessions__skeleton"></div>
        </div>

        <div v-else-if="sessionsError" class="alert alert-error chat-sessions__error">
          <span class="alert__icon">!</span>
          <span>{{ sessionsError }}</span>
          <button type="button" class="link" @click="loadSessions">重试</button>
        </div>

        <ul v-else-if="sessions.length" class="session-list">
          <li v-for="session in sessions" :key="session.id" class="session-item">
            <button
              type="button"
              class="session-item__main"
              :class="{ 'is-active': session.id === currentSessionId }"
              @click="openSession(session)"
            >
              <span class="session-item__title">{{ session.title || `会话 #${session.id}` }}</span>
              <small>{{ formatDate(session.updatedAt) }}</small>
            </button>
            <button
              type="button"
              class="session-item__delete"
              title="删除会话"
              aria-label="删除会话"
              @click="removeSession(session)"
            >
              ×
            </button>
          </li>
        </ul>

        <div v-else class="chat-sessions__empty">
          <span class="chat-sessions__empty-icon">💬</span>
          <p>还没有会话</p>
          <small>点击「新建」或直接发送消息，开始和 AI 对话。</small>
        </div>
      </aside>

      <div class="card chat-panel">
        <div class="chat-panel__head">
          <div>
            <h2>{{ currentSession ? currentSession.title : '新会话' }}</h2>
            <p>{{ currentSession ? `会话 #${currentSession.id}` : '发送第一条消息后会自动创建会话' }}</p>
          </div>
          <button
            v-if="currentSession"
            type="button"
            class="btn btn-ghost btn-sm"
            :disabled="sending"
            @click="removeSession(currentSession)"
          >
            删除会话
          </button>
        </div>

        <div ref="chatBody" class="chat-messages">
          <div v-if="messagesLoading" class="chat-loading">
            <div v-for="index in 3" :key="index" class="skeleton chat-loading__line"></div>
          </div>

          <template v-else>
            <div v-if="!messages.length" class="chat-welcome">
              <span class="chat-welcome__icon">AI</span>
              <h3>有什么可以帮你？</h3>
              <p>可以问我关于笔记发布、审核、AI 功能或社区使用的问题。</p>
              <div class="chat-welcome__suggestions">
                <button
                  v-for="question in suggestedQuestions"
                  :key="question"
                  type="button"
                  @click="quickAsk(question)"
                >
                  {{ question }}
                </button>
              </div>
            </div>

            <div
              v-for="(message, index) in messages"
              :key="message.id || `message-${index}`"
              class="chat-message"
              :class="`chat-message--${message.role}`"
            >
              <UserAvatar
                v-if="message.role === 'user'"
                :src="currentUser.avatar"
                :name="currentUser.nickname || currentUser.username"
                :size="32"
              />
              <span v-else class="ai-avatar">AI</span>
              <div class="chat-bubble">
                <p>{{ message.content }}</p>
                <time>{{ timeAgo(message.createdAt) }}</time>
              </div>
            </div>

            <div v-if="sending" class="chat-message chat-message--assistant">
              <span class="ai-avatar">AI</span>
              <div class="chat-bubble chat-bubble--typing" aria-label="AI 正在回复">
                <span></span><span></span><span></span>
              </div>
            </div>
          </template>
        </div>

        <div v-if="chatError" class="alert alert-warning chat-error">
          <span class="alert__icon">!</span>
          <span>{{ chatError }}</span>
        </div>

        <form class="chat-input" @submit.prevent="sendMessage">
          <textarea
            v-model="chatInput"
            class="textarea chat-input__field"
            maxlength="2000"
            placeholder="输入你的问题，Enter 发送，Shift + Enter 换行…"
            :disabled="sending"
            @keydown.enter.exact.prevent="sendMessage"
          ></textarea>
          <div class="chat-input__foot">
            <span class="form-hint">{{ chatInput.length }}/2000</span>
            <button
              type="submit"
              class="btn btn-primary btn-sm"
              :disabled="sending || !chatInput.trim()"
            >
              <span v-if="sending" class="spinner"></span>
              {{ sending ? '回复中…' : '发送' }}
            </button>
          </div>
        </form>
        <p class="chat-panel__hint">AI 可能会犯错，重要信息请自行核实。</p>
      </div>
    </section>

    <!-- AI 状态 -->
    <section v-else class="ai-status-page">
      <div class="ai-status-grid">
        <div class="card ai-status-card">
          <span class="ai-status-card__label">AI 服务状态</span>
          <div class="ai-status-card__value" :class="statusPillClass">
            <span class="ai-status-pill__dot"></span>
            {{ statusLabel }}
          </div>
          <p>状态来自后端 <code>/api/ai/status</code> 接口。</p>
          <button type="button" class="btn btn-outline btn-sm" @click="loadAiStatus">
            重新检测
          </button>
        </div>

        <div class="card ai-status-card">
          <span class="ai-status-card__label">支持场景</span>
          <div class="scene-chips">
            <span v-for="scene in scenes" :key="scene" class="scene-chip">{{ scene }}</span>
          </div>
          <p>阅读辅助（总结 / 人群 / 评分）与智能客服会话。</p>
        </div>
      </div>

      <div class="card ai-config-card">
        <h2>配置说明</h2>
        <p>AI 功能需要后端配置以下环境变量后重启服务：</p>
        <pre class="ai-config-code">AI_API_KEY=sk-...
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
AI_ENABLED=true</pre>
        <p class="ai-config-hint">
          未配置时，生成与客服接口会返回 503。本页面会提示「AI 未配置，请设置 AI_API_KEY」，不会白屏。
        </p>

        <div v-if="statusNote" class="alert alert-info">
          <span class="alert__icon">i</span>
          <span>后端提示：{{ statusNote }}</span>
        </div>
        <div v-if="statusError" class="alert alert-error">
          <span class="alert__icon">!</span>
          <span>{{ statusError }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import api from '@/api'
import auth from '@/store/auth'
import { notifyError, notifySuccess } from '@/store/toast'
import UserAvatar from '@/components/UserAvatar.vue'
import EmptyState from '@/components/EmptyState.vue'
import { aiTypeLabel, formatDate, timeAgo } from '@/utils/format'

const AI_TYPES = [
  { value: 'SUMMARY', label: '内容总结', icon: '✦', desc: '提炼笔记的核心观点与要点' },
  { value: 'AUDIENCE', label: '适合人群', icon: '◎', desc: '推荐 3 类最适合阅读的人群' },
  { value: 'SCORE', label: '质量评分', icon: '★', desc: '从三个维度评分并给出建议' }
]

const SUGGESTED_QUESTIONS = [
  '怎么发表一篇公开笔记？',
  '公开笔记审核需要多久？',
  '如何让笔记更容易被推荐？'
]

export default {
  name: 'AiView',
  components: { UserAvatar, EmptyState },
  setup() {
    const activeTab = ref('read')
    const currentUser = computed(() => auth.state.user || {})

    const aiStatus = ref(null)
    const statusLoading = ref(false)
    const statusError = ref('')
    const aiUnavailable = ref(false)
    const aiUnavailableMessage = ref('')

    const myNotes = ref([])
    const notesLoading = ref(true)
    const notesError = ref('')
    const selectedNoteId = ref(null)
    const selectedType = ref('SUMMARY')
    const existingAi = ref(null)
    const generating = ref(false)
    const result = ref(null)
    const readError = ref('')
    const savingResult = ref(false)

    const sessions = ref([])
    const sessionsLoading = ref(false)
    const sessionsError = ref('')
    const sessionsLoaded = ref(false)
    const currentSessionId = ref(null)
    const messages = ref([])
    const messagesLoading = ref(false)
    const chatInput = ref('')
    const sending = ref(false)
    const chatError = ref('')
    const chatBody = ref(null)

    const aiTypes = AI_TYPES
    const suggestedQuestions = SUGGESTED_QUESTIONS

    const statusPillClass = computed(() => {
      if (statusLoading.value) return 'is-unknown'
      if (aiUnavailable.value) return 'is-disabled'
      if (!aiStatus.value) return 'is-unknown'
      return aiStatus.value.enabled ? 'is-enabled' : 'is-disabled'
    })

    const statusLabel = computed(() => {
      if (statusLoading.value) return '检测中…'
      if (aiUnavailable.value) return 'AI 不可用'
      if (!aiStatus.value) return '状态未知'
      return aiStatus.value.enabled ? 'AI 已启用' : 'AI 未启用'
    })

    const scenes = computed(() => {
      if (aiStatus.value && Array.isArray(aiStatus.value.scenes)) {
        return aiStatus.value.scenes
      }
      return ['SUMMARY', 'AUDIENCE', 'SCORE', 'CHAT']
    })

    const statusNote = computed(() => (aiStatus.value && aiStatus.value.note) || '')

    const showBanner = computed(
      () => aiUnavailable.value || Boolean(aiStatus.value && aiStatus.value.enabled === false)
    )

    const bannerDetail = computed(() => {
      if (aiUnavailableMessage.value) return aiUnavailableMessage.value
      if (aiStatus.value && aiStatus.value.note) return aiStatus.value.note
      return '请在后端设置环境变量 AI_API_KEY 后重启服务，再回来重试。'
    })

    const currentSession = computed(
      () => sessions.value.find((item) => item.id === currentSessionId.value) || null
    )

    async function loadAiStatus() {
      statusLoading.value = true
      statusError.value = ''
      try {
        aiStatus.value = await api.get('/api/ai/status')
        if (aiStatus.value && aiStatus.value.enabled) {
          aiUnavailable.value = false
          aiUnavailableMessage.value = ''
        }
      } catch (err) {
        statusError.value = err.message || 'AI 状态加载失败'
      } finally {
        statusLoading.value = false
      }
    }

    async function loadMyNotes() {
      notesLoading.value = true
      notesError.value = ''
      try {
        const data = await api.get('/api/notes/mine', { params: { page: 1, size: 100 } })
        myNotes.value = Array.isArray(data.records) ? data.records : []
        if (myNotes.value.length) {
          const stillExists = myNotes.value.some((note) => note.id === selectedNoteId.value)
          if (!stillExists) {
            selectedNoteId.value = myNotes.value[0].id
          }
          await loadExistingAi()
        } else {
          selectedNoteId.value = null
          existingAi.value = null
        }
      } catch (err) {
        notesError.value = err.message || '我的笔记加载失败'
        notifyError(err)
      } finally {
        notesLoading.value = false
      }
    }

    async function loadExistingAi() {
      if (!selectedNoteId.value) {
        existingAi.value = null
        return
      }
      try {
        const data = await api.get(`/api/ai/notes/${selectedNoteId.value}`)
        existingAi.value = data && data.content ? data : null
      } catch (err) {
        existingAi.value = null
      }
    }

    watch(selectedNoteId, async () => {
      result.value = null
      readError.value = ''
      await loadExistingAi()
    })

    function chooseType(type) {
      selectedType.value = type
      result.value = null
      readError.value = ''
    }

    function friendlyAiError(err) {
      const message = (err && err.message) || 'AI 服务暂不可用，请稍后重试'
      const unavailable =
        (err && err.code === 503) ||
        /AI 未配置|AI 服务|AI 功能未启用|API_KEY|未配置/i.test(message)
      if (unavailable) {
        aiUnavailable.value = true
        aiUnavailableMessage.value =
          '后端 AI 服务暂不可用，请检查 AI_API_KEY、AI_BASE_URL 与 AI_MODEL 配置后重启服务。'
        return 'AI 未配置，请设置 AI_API_KEY 后重试。'
      }
      return message
    }

    async function generate() {
      if (!selectedNoteId.value) {
        notifyError('请先选择一篇笔记')
        return
      }
      generating.value = true
      readError.value = ''
      result.value = null
      try {
        const data = await api.post(`/api/ai/notes/${selectedNoteId.value}/generate`, {
          type: selectedType.value
        })
        result.value = data
        aiUnavailable.value = false
        notifySuccess('AI 内容生成完成')
      } catch (err) {
        readError.value = friendlyAiError(err)
        notifyError(err)
      } finally {
        generating.value = false
      }
    }

    async function saveResult() {
      if (!result.value || !selectedNoteId.value) return
      savingResult.value = true
      try {
        const data = await api.post(`/api/ai/notes/${selectedNoteId.value}/save`, {
          type: result.value.type,
          content: result.value.content
        })
        result.value.saved = true
        existingAi.value = { type: data.type, content: data.content }
        notifySuccess('已保存到笔记，详情页将展示 AI 辅助区块')
      } catch (err) {
        notifyError(err)
      } finally {
        savingResult.value = false
      }
    }

    async function copyResult() {
      if (!result.value) return
      try {
        await navigator.clipboard.writeText(result.value.content)
        notifySuccess('已复制到剪贴板')
      } catch (err) {
        notifyError('复制失败，请手动选择文本复制')
      }
    }

    function switchTab(tab) {
      activeTab.value = tab
      if (tab === 'chat' && !sessionsLoaded.value) {
        loadSessions()
      }
      if (tab === 'chat') {
        scrollChat()
      }
    }

    async function loadSessions() {
      sessionsLoading.value = true
      sessionsError.value = ''
      try {
        const data = await api.get('/api/ai/sessions')
        sessions.value = Array.isArray(data) ? data : []
        sessionsLoaded.value = true
      } catch (err) {
        sessionsError.value = err.message || '会话列表加载失败'
      } finally {
        sessionsLoading.value = false
      }
    }

    function newSession() {
      if (sending.value) {
        notifyError('请等待当前回复完成')
        return
      }
      currentSessionId.value = null
      messages.value = []
      chatInput.value = ''
      chatError.value = ''
      scrollChat()
    }

    async function openSession(session) {
      if (sending.value) {
        notifyError('请等待当前回复完成')
        return
      }
      currentSessionId.value = session.id
      chatError.value = ''
      messagesLoading.value = true
      try {
        const data = await api.get(`/api/ai/sessions/${session.id}/messages`)
        messages.value = Array.isArray(data) ? data : []
        scrollChat()
      } catch (err) {
        chatError.value = err.message || '会话记录加载失败'
        messages.value = []
      } finally {
        messagesLoading.value = false
      }
    }

    async function removeSession(session) {
      if (!session) return
      if (sending.value) {
        notifyError('请等待当前回复完成')
        return
      }
      if (!window.confirm(`确定删除会话「${session.title || `会话 #${session.id}`}」吗？`)) return
      try {
        await api.delete(`/api/ai/sessions/${session.id}`)
        if (currentSessionId.value === session.id) {
          currentSessionId.value = null
          messages.value = []
        }
        notifySuccess('会话已删除')
        await loadSessions()
      } catch (err) {
        notifyError(err)
      }
    }

    function quickAsk(question) {
      chatInput.value = question
      sendMessage()
    }

    async function sendMessage() {
      const text = chatInput.value.trim()
      if (!text || sending.value) return
      if (text.length > 2000) {
        notifyError('消息不能超过 2000 个字符')
        return
      }

      const sessionId = currentSessionId.value
      messages.value.push({
        id: `temp-user-${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString()
      })
      chatInput.value = ''
      chatError.value = ''
      sending.value = true
      scrollChat()

      try {
        const data = await api.post('/api/ai/chat', { sessionId, message: text })
        currentSessionId.value = data.sessionId
        messages.value.push({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          createdAt: new Date().toISOString()
        })
        aiUnavailable.value = false
        sessionsLoaded.value = false
        await loadSessions()
      } catch (err) {
        chatError.value = friendlyAiError(err)
        notifyError(err)
        sessionsLoaded.value = false
        loadSessions()
      } finally {
        sending.value = false
        scrollChat()
      }
    }

    function scrollChat() {
      nextTick(() => {
        const element = chatBody.value
        if (element) element.scrollTop = element.scrollHeight
      })
    }

    onMounted(() => {
      loadAiStatus()
      loadMyNotes()
    })

    return {
      activeTab,
      currentUser,
      aiStatus,
      statusLoading,
      statusError,
      aiUnavailable,
      aiUnavailableMessage,
      myNotes,
      notesLoading,
      notesError,
      selectedNoteId,
      selectedType,
      existingAi,
      generating,
      result,
      readError,
      savingResult,
      sessions,
      sessionsLoading,
      sessionsError,
      currentSessionId,
      messages,
      messagesLoading,
      chatInput,
      sending,
      chatError,
      chatBody,
      aiTypes,
      suggestedQuestions,
      statusPillClass,
      statusLabel,
      scenes,
      statusNote,
      showBanner,
      bannerDetail,
      currentSession,
      loadAiStatus,
      loadMyNotes,
      chooseType,
      generate,
      saveResult,
      copyResult,
      switchTab,
      loadSessions,
      newSession,
      openSession,
      removeSession,
      quickAsk,
      sendMessage,
      aiTypeLabel,
      formatDate,
      timeAgo
    }
  }
}
</script>

<style scoped>
.ai-page {
  max-width: 1080px;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
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

.ai-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.ai-status-pill__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted-2);
}

.ai-status-pill.is-enabled {
  border-color: #c8ebd9;
  background: var(--success-soft);
  color: var(--success);
}

.ai-status-pill.is-enabled .ai-status-pill__dot {
  background: var(--success);
  box-shadow: 0 0 0 3px rgba(31, 157, 99, 0.15);
}

.ai-status-pill.is-disabled {
  border-color: #f5dcb8;
  background: var(--warning-soft);
  color: var(--warning);
}

.ai-status-pill.is-disabled .ai-status-pill__dot {
  background: var(--warning);
}

.ai-banner {
  align-items: center;
  margin-bottom: 18px;
}

.ai-banner__body {
  flex: 1;
  min-width: 0;
}

.ai-banner__body strong {
  display: block;
  font-size: 13px;
}

.ai-banner__body p {
  margin-top: 2px;
  font-size: 12px;
  opacity: 0.85;
}

.ai-banner__btn {
  flex: none;
}

.ai-tabs {
  margin-bottom: 20px;
  width: fit-content;
}

.ai-read-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.88fr) minmax(0, 1.12fr);
  gap: 20px;
  align-items: start;
}

.ai-panel,
.ai-result {
  padding: 24px 26px;
}

.ai-panel__head,
.ai-result__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 20px;
}

.ai-panel__head h2,
.ai-result__head h2 {
  font-size: 18px;
  letter-spacing: -0.02em;
}

.ai-panel__head p,
.ai-result__head p {
  margin-top: 3px;
  color: var(--muted);
  font-size: 12px;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.type-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 12px 10px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.type-card:hover:not(:disabled) {
  border-color: #c6d7fb;
  background: var(--surface-2);
}

.type-card.is-active {
  border-color: var(--primary);
  background: var(--primary-softer);
  box-shadow: 0 0 0 3px rgba(59, 110, 246, 0.08);
}

.type-card:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.type-card__icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  margin-bottom: 2px;
  border-radius: 8px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 13px;
}

.type-card strong {
  color: var(--text-2);
  font-size: 12px;
}

.type-card small {
  color: var(--muted);
  font-size: 10px;
  line-height: 1.45;
}

.existing-ai {
  padding: 12px 14px;
  margin-bottom: 18px;
  border: 1px solid #d8e4ff;
  border-radius: 11px;
  background: var(--primary-softer);
}

.existing-ai__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--primary-700);
  font-size: 11px;
  font-weight: 700;
}

.existing-ai p {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 6px;
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.65;
  white-space: pre-wrap;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.ai-panel__hint {
  margin-top: 11px;
  color: var(--muted-2);
  font-size: 11px;
  line-height: 1.6;
  text-align: center;
}

.ai-panel__loading {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-panel__loading-select {
  height: 42px;
}

.ai-panel__loading-type {
  height: 92px;
}

.ai-panel__loading-btn {
  height: 46px;
}

.ai-result {
  min-height: 420px;
}

.ai-result__body {
  display: flex;
  flex-direction: column;
  min-height: 330px;
}

.ai-result__content {
  flex: 1;
  font-size: 14px;
}

.ai-result__actions {
  display: flex;
  gap: 9px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
}

.ai-result__error {
  display: block;
}

.ai-result__error strong {
  display: block;
}

.ai-result__error-tip {
  margin-top: 5px;
  font-size: 12px;
  opacity: 0.85;
}

.ai-generating {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
  color: var(--muted);
  font-size: 13px;
}

.ai-generating__orb {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, #3b6ef6, #7a5cf0, #3b6ef6);
  animation: orb-spin 1.2s linear infinite;
  filter: blur(0.3px);
}

.ai-generating__orb::after {
  content: '';
  display: block;
  width: 30px;
  height: 30px;
  margin: 8px;
  border-radius: 50%;
  background: #fff;
}

@keyframes orb-spin {
  to {
    transform: rotate(360deg);
  }
}

.ai-generating__lines {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 12px;
}

.ai-generating__lines .skeleton {
  height: 12px;
  width: 100%;
}

.ai-generating__lines .skeleton:nth-child(3) {
  width: 88%;
}

.ai-generating__lines .skeleton:nth-child(4) {
  width: 62%;
}

/* chat */
.ai-chat-layout {
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  gap: 18px;
  align-items: stretch;
  min-height: 600px;
}

.chat-sessions {
  display: flex;
  flex-direction: column;
  padding: 18px;
  min-height: 0;
}

.chat-sessions__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.chat-sessions__head h2 {
  font-size: 15px;
}

.chat-sessions__loading {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-sessions__skeleton {
  height: 48px;
  border-radius: 10px;
}

.chat-sessions__error {
  display: block;
}

.chat-sessions__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 38px 10px;
  color: var(--muted);
  text-align: center;
}

.chat-sessions__empty-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  margin-bottom: 6px;
  border-radius: 14px;
  background: var(--primary-softer);
  font-size: 20px;
}

.chat-sessions__empty p {
  color: var(--text-2);
  font-size: 13px;
  font-weight: 600;
}

.chat-sessions__empty small {
  font-size: 11px;
  line-height: 1.6;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  max-height: 520px;
}

.session-item {
  position: relative;
}

.session-item__main {
  display: block;
  width: 100%;
  padding: 10px 30px 10px 11px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.session-item__main:hover {
  background: var(--surface-2);
}

.session-item__main.is-active {
  border-color: #d8e4ff;
  background: var(--primary-softer);
}

.session-item__title {
  display: block;
  overflow: hidden;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-item__main small {
  display: block;
  margin-top: 2px;
  color: var(--muted-2);
  font-size: 10px;
}

.session-item__delete {
  position: absolute;
  top: 50%;
  right: 6px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-top: -12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted-2);
  font-size: 16px;
  cursor: pointer;
}

.session-item__delete:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

.chat-panel {
  display: flex;
  flex-direction: column;
  min-height: 600px;
  max-height: 720px;
  overflow: hidden;
}

.chat-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.chat-panel__head h2 {
  overflow: hidden;
  max-width: 520px;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-panel__head p {
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: linear-gradient(180deg, #fbfcff, #f8faff);
  scroll-behavior: smooth;
}

.chat-loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-loading__line {
  height: 14px;
  width: 72%;
}

.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 42px 20px;
  text-align: center;
}

.chat-welcome__icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin-bottom: 12px;
  border-radius: 16px;
  background: linear-gradient(140deg, #4d7df8, #7a5cf0);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 12px 24px -14px rgba(59, 110, 246, 0.9);
}

.chat-welcome h3 {
  font-size: 17px;
}

.chat-welcome p {
  margin-top: 5px;
  color: var(--muted);
  font-size: 12px;
}

.chat-welcome__suggestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
}

.chat-welcome__suggestions button {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-2);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chat-welcome__suggestions button:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-softer);
}

.chat-message {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-bottom: 16px;
}

.chat-message--user {
  flex-direction: row-reverse;
}

.ai-avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(140deg, #4d7df8, #7a5cf0);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}

.chat-bubble {
  max-width: 76%;
  padding: 10px 13px;
  border: 1px solid var(--border);
  border-radius: 4px 14px 14px 14px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.chat-message--user .chat-bubble {
  border-color: #cfe0ff;
  border-radius: 14px 4px 14px 14px;
  background: var(--primary-soft);
}

.chat-bubble p {
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-bubble time {
  display: block;
  margin-top: 4px;
  color: var(--muted-2);
  font-size: 9px;
  text-align: right;
}

.chat-bubble--typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 14px;
}

.chat-bubble--typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--muted-2);
  animation: typing 1.1s ease-in-out infinite;
}

.chat-bubble--typing span:nth-child(2) {
  animation-delay: 0.15s;
}

.chat-bubble--typing span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

.chat-error {
  margin: 0 20px 10px;
}

.chat-input {
  padding: 12px 16px 6px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.chat-input__field {
  min-height: 62px;
  max-height: 150px;
  border-color: var(--border);
  background: var(--surface-2);
}

.chat-input__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 7px;
}

.chat-panel__hint {
  padding: 0 16px 10px;
  color: var(--muted-2);
  font-size: 10px;
  text-align: center;
}

/* status */
.ai-status-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ai-status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.ai-status-card {
  padding: 22px 24px;
}

.ai-status-card__label {
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.ai-status-card__value {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.ai-status-card__value.is-enabled {
  color: var(--success);
}

.ai-status-card__value.is-enabled .ai-status-pill__dot {
  background: var(--success);
}

.ai-status-card__value.is-disabled {
  color: var(--warning);
}

.ai-status-card__value.is-disabled .ai-status-pill__dot {
  background: var(--warning);
}

.ai-status-card p {
  margin-top: 8px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

.ai-status-card .btn {
  margin-top: 14px;
}

.ai-status-card code {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--surface-2);
  font-size: 11px;
}

.scene-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 14px;
}

.scene-chip {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 7px;
  background: var(--primary-soft);
  color: var(--primary-700);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.ai-config-card {
  padding: 26px 28px;
}

.ai-config-card h2 {
  font-size: 18px;
}

.ai-config-card > p {
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
}

.ai-config-code {
  margin: 14px 0;
  padding: 16px 18px;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: #101a32;
  color: #cfe0ff;
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 12px;
  line-height: 1.8;
}

.ai-config-hint {
  font-size: 12px !important;
}

.ai-config-card .alert {
  margin-top: 14px;
}

@media (max-width: 960px) {
  .ai-read-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .ai-result {
    min-height: 300px;
  }

  .ai-chat-layout {
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
  }

  .chat-sessions {
    min-height: 0;
  }

  .session-list {
    max-height: 220px;
  }

  .chat-panel {
    min-height: 560px;
  }
}

@media (max-width: 680px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .ai-panel,
  .ai-result {
    padding: 20px;
  }

  .type-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .ai-status-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .ai-banner {
    flex-wrap: wrap;
  }

  .ai-banner__btn {
    margin-left: 30px;
  }

  .chat-bubble {
    max-width: 84%;
  }

  .chat-panel__head h2 {
    max-width: 200px;
  }
}
</style>
