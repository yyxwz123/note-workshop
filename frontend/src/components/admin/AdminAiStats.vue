<template>
  <div class="ai-stats">
    <div class="ai-stats__head">
      <div>
        <h2>AI 调用统计</h2>
        <p>查看 AI 阅读辅助与客服的调用量和成功率。</p>
      </div>
      <button type="button" class="btn btn-outline btn-sm" :disabled="loading" @click="load">
        刷新数据
      </button>
    </div>

    <div v-if="loading" class="stat-grid">
      <div v-for="index in 4" :key="index" class="card stat-skeleton">
        <div class="skeleton stat-skeleton__label"></div>
        <div class="skeleton stat-skeleton__value"></div>
      </div>
    </div>

    <div v-else-if="error" class="card">
      <EmptyState icon="!" title="AI 统计加载失败" :description="error">
        <button type="button" class="btn btn-primary" @click="load">重新加载</button>
      </EmptyState>
    </div>

    <template v-else>
      <div class="stat-grid">
        <div class="card stat-card">
          <span class="stat-card__label">总调用次数</span>
          <strong class="stat-card__value">{{ formatNumber(stats.total) }}</strong>
        </div>
        <div class="card stat-card stat-card--success">
          <span class="stat-card__label">成功次数</span>
          <strong class="stat-card__value">{{ formatNumber(stats.success) }}</strong>
        </div>
        <div class="card stat-card stat-card--danger">
          <span class="stat-card__label">失败次数</span>
          <strong class="stat-card__value">{{ formatNumber(stats.fail) }}</strong>
        </div>
        <div class="card stat-card stat-card--primary">
          <span class="stat-card__label">整体成功率</span>
          <strong class="stat-card__value">{{ successRate }}%</strong>
        </div>
      </div>

      <div class="card scene-panel">
        <div class="scene-panel__head">
          <div>
            <h2>按场景统计</h2>
            <p>共 {{ rows.length }} 个 AI 场景产生过调用记录</p>
          </div>
          <span class="badge badge-primary">{{ formatNumber(stats.total) }} 次</span>
        </div>

        <div v-if="rows.length" class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>场景</th>
                <th>调用次数</th>
                <th>成功</th>
                <th>失败</th>
                <th>成功率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.scene || row.sceneName">
                <td>
                  <span class="scene-name">{{ sceneLabel(row.scene) }}</span>
                  <span class="table-sub">{{ row.scene }}</span>
                </td>
                <td>{{ formatNumber(row.total) }}</td>
                <td class="text-success">{{ formatNumber(row.success) }}</td>
                <td class="text-danger">{{ formatNumber(rowFail(row)) }}</td>
                <td>
                  <div class="scene-rate">
                    <div class="progress progress--small">
                      <span class="progress__bar" :style="{ width: `${rowRate(row)}%` }"></span>
                    </div>
                    <span>{{ rowRate(row) }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <EmptyState
          v-else
          icon="✦"
          title="还没有 AI 调用记录"
          description="配置 AI_API_KEY 后，使用 AI 助手生成内容或聊天，这里会出现统计数据。"
        />
      </div>
    </template>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue'
import api from '@/api'
import { notifyError } from '@/store/toast'
import EmptyState from '@/components/EmptyState.vue'

const SCENE_LABELS = {
  SUMMARY: '阅读总结',
  AUDIENCE: '适合人群',
  SCORE: '质量评分',
  CHAT: '智能客服'
}

export default {
  name: 'AdminAiStats',
  components: { EmptyState },
  setup() {
    const stats = ref({})
    const loading = ref(true)
    const error = ref('')

    const rows = computed(() => (Array.isArray(stats.value.byScene) ? stats.value.byScene : []))

    const successRate = computed(() => {
      const total = Number(stats.value.total) || 0
      const success = Number(stats.value.success) || 0
      if (!total) return 0
      return Math.round((success / total) * 100)
    })

    function formatNumber(value) {
      return (Number(value) || 0).toLocaleString('zh-CN')
    }

    function sceneLabel(scene) {
      return SCENE_LABELS[scene] || scene || '未知场景'
    }

    function rowFail(row) {
      return Math.max(0, (Number(row.total) || 0) - (Number(row.success) || 0))
    }

    function rowRate(row) {
      const total = Number(row.total) || 0
      if (!total) return 0
      return Math.round(((Number(row.success) || 0) / total) * 100)
    }

    async function load() {
      loading.value = true
      error.value = ''
      try {
        stats.value = await api.get('/api/admin/ai/stats')
      } catch (err) {
        error.value = err.message || 'AI 统计加载失败'
        notifyError(err)
      } finally {
        loading.value = false
      }
    }

    onMounted(load)

    return {
      stats,
      loading,
      error,
      rows,
      successRate,
      formatNumber,
      sceneLabel,
      rowFail,
      rowRate,
      load
    }
  }
}
</script>

<style scoped>
.ai-stats {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ai-stats__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.ai-stats__head h2 {
  font-size: 19px;
  letter-spacing: -0.02em;
}

.ai-stats__head p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  padding: 20px;
}

.stat-card__label {
  display: block;
  color: var(--muted);
  font-size: 11px;
}

.stat-card__value {
  display: block;
  margin-top: 6px;
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: -0.04em;
}

.stat-card--success .stat-card__value {
  color: var(--success);
}

.stat-card--danger .stat-card__value {
  color: var(--danger);
}

.stat-card--primary .stat-card__value {
  color: var(--primary);
}

.stat-skeleton {
  padding: 20px;
}

.stat-skeleton__label {
  width: 60px;
  height: 12px;
}

.stat-skeleton__value {
  width: 84px;
  height: 28px;
  margin-top: 10px;
}

.scene-panel {
  padding: 22px 24px;
}

.scene-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.scene-panel__head h2 {
  font-size: 16px;
}

.scene-panel__head p {
  margin-top: 3px;
  color: var(--muted);
  font-size: 11px;
}

.scene-name {
  display: block;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
}

.scene-rate {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 130px;
  color: var(--muted);
  font-size: 11px;
}

.progress {
  flex: 1;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #edf1f9;
}

.progress--small {
  height: 6px;
}

.progress__bar {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #4d7df8, #7a5cf0);
}

@media (max-width: 900px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
