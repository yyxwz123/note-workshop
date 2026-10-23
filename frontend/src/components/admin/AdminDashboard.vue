<template>
  <div class="dashboard">
    <div v-if="loading" class="stat-grid">
      <div v-for="index in 8" :key="index" class="card stat-skeleton">
        <div class="skeleton stat-skeleton__label"></div>
        <div class="skeleton stat-skeleton__value"></div>
      </div>
    </div>

    <div v-else-if="error" class="card">
      <EmptyState icon="!" title="概览数据加载失败" :description="error">
        <button type="button" class="btn btn-primary" @click="load">重新加载</button>
      </EmptyState>
    </div>

    <template v-else>
      <div class="stat-grid">
        <div v-for="stat in stats" :key="stat.key" class="card stat-card" :class="stat.tone">
          <span class="stat-card__icon">{{ stat.icon }}</span>
          <span class="stat-card__label">{{ stat.label }}</span>
          <strong class="stat-card__value">{{ formatNumber(dashboard[stat.key]) }}</strong>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card dashboard-panel">
          <div class="dashboard-panel__head">
            <div>
              <h2>AI 调用概览</h2>
              <p>共 {{ formatNumber(dashboard.aiTotal) }} 次调用，成功 {{ formatNumber(dashboard.aiSuccess) }} 次</p>
            </div>
            <span class="badge badge-primary">成功率 {{ successRate }}%</span>
          </div>

          <div class="progress">
            <span class="progress__bar" :style="{ width: `${successRate}%` }"></span>
          </div>

          <div class="ai-mini-stats">
            <div>
              <span>成功</span>
              <strong class="text-success">{{ formatNumber(dashboard.aiSuccess) }}</strong>
            </div>
            <div>
              <span>失败</span>
              <strong class="text-danger">{{ formatNumber(dashboard.aiFail) }}</strong>
            </div>
            <div>
              <span>总调用</span>
              <strong>{{ formatNumber(dashboard.aiTotal) }}</strong>
            </div>
          </div>
        </div>

        <div class="card dashboard-panel">
          <div class="dashboard-panel__head">
            <div>
              <h2>快捷操作</h2>
              <p>处理社区里需要关注的事情</p>
            </div>
          </div>

          <div class="quick-actions">
            <button type="button" class="quick-action" @click="$emit('navigate', 'review')">
              <span class="quick-action__icon quick-action__icon--warning">✓</span>
              <span>
                <strong>待审核笔记</strong>
                <small>{{ formatNumber(dashboard.pendingNoteCount) }} 篇等待处理</small>
              </span>
            </button>
            <button type="button" class="quick-action" @click="$emit('navigate', 'users')">
              <span class="quick-action__icon">◉</span>
              <span>
                <strong>用户管理</strong>
                <small>搜索用户、启用或禁用账号</small>
              </span>
            </button>
            <button type="button" class="quick-action" @click="$emit('navigate', 'ai')">
              <span class="quick-action__icon quick-action__icon--purple">✦</span>
              <span>
                <strong>AI 统计</strong>
                <small>按场景查看调用成功率</small>
              </span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue'
import api from '@/api'
import { notifyError } from '@/store/toast'
import EmptyState from '@/components/EmptyState.vue'

const STAT_DEFS = [
  { key: 'userCount', label: '用户总数', icon: '◉', tone: '' },
  { key: 'noteCount', label: '笔记总数', icon: '▤', tone: '' },
  { key: 'publicNoteCount', label: '公开笔记', icon: '🌐', tone: '' },
  { key: 'pendingNoteCount', label: '待审核', icon: '!', tone: 'stat-card--warning' },
  { key: 'commentCount', label: '评论总数', icon: '💬', tone: '' },
  { key: 'followCount', label: '关注关系', icon: '♥', tone: '' },
  { key: 'aiTotal', label: 'AI 调用', icon: '✦', tone: '' },
  { key: 'aiSuccess', label: 'AI 成功', icon: '✓', tone: 'stat-card--success' }
]

export default {
  name: 'AdminDashboard',
  components: { EmptyState },
  emits: ['navigate'],
  setup() {
    const dashboard = ref({})
    const loading = ref(true)
    const error = ref('')
    const stats = STAT_DEFS

    const successRate = computed(() => {
      const total = Number(dashboard.value.aiTotal) || 0
      const success = Number(dashboard.value.aiSuccess) || 0
      if (!total) return 0
      return Math.round((success / total) * 100)
    })

    function formatNumber(value) {
      const number = Number(value) || 0
      return number.toLocaleString('zh-CN')
    }

    async function load() {
      loading.value = true
      error.value = ''
      try {
        dashboard.value = await api.get('/api/admin/dashboard')
      } catch (err) {
        error.value = err.message || '概览数据加载失败'
        notifyError(err)
      } finally {
        loading.value = false
      }
    }

    onMounted(load)

    return { dashboard, loading, error, stats, successRate, formatNumber, load }
  }
}
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  position: relative;
  padding: 18px 18px 16px;
  overflow: hidden;
}

.stat-card__icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  margin-bottom: 12px;
  border-radius: 9px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 13px;
}

.stat-card__label {
  display: block;
  color: var(--muted);
  font-size: 11px;
}

.stat-card__value {
  display: block;
  margin-top: 3px;
  font-size: 25px;
  line-height: 1.2;
  letter-spacing: -0.035em;
}

.stat-card--warning .stat-card__icon {
  background: var(--warning-soft);
  color: var(--warning);
}

.stat-card--warning .stat-card__value {
  color: var(--warning);
}

.stat-card--success .stat-card__icon {
  background: var(--success-soft);
  color: var(--success);
}

.stat-card--success .stat-card__value {
  color: var(--success);
}

.stat-skeleton {
  padding: 18px;
}

.stat-skeleton__label {
  width: 54px;
  height: 12px;
  margin-top: 22px;
}

.stat-skeleton__value {
  width: 74px;
  height: 24px;
  margin-top: 9px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 18px;
}

.dashboard-panel {
  padding: 22px 24px;
}

.dashboard-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.dashboard-panel__head h2 {
  font-size: 16px;
  letter-spacing: -0.01em;
}

.dashboard-panel__head p {
  margin-top: 3px;
  color: var(--muted);
  font-size: 11px;
}

.progress {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #edf1f9;
}

.progress__bar {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #4d7df8, #7a5cf0);
  transition: width 0.4s ease;
}

.ai-mini-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.ai-mini-stats > div {
  text-align: center;
}

.ai-mini-stats span {
  display: block;
  color: var(--muted);
  font-size: 10px;
}

.ai-mini-stats strong {
  display: block;
  margin-top: 3px;
  font-size: 17px;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-action {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 12px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-action:hover {
  border-color: #c6d7fb;
  background: var(--surface-2);
}

.quick-action__icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
}

.quick-action__icon--warning {
  background: var(--warning-soft);
  color: var(--warning);
}

.quick-action__icon--purple {
  background: #f1ecff;
  color: #7a5cf0;
}

.quick-action strong {
  display: block;
  color: var(--text-2);
  font-size: 12px;
}

.quick-action small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 10px;
}

@media (max-width: 1000px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
