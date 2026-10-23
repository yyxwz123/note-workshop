<template>
  <div class="container admin-page">
    <div class="page-head">
      <div>
        <span class="eyebrow">ADMIN CONSOLE</span>
        <h1>管理后台</h1>
        <p>管理用户、审核公开笔记、处理违规内容，并查看 AI 使用情况。</p>
      </div>
      <RouterLink to="/" class="btn btn-ghost">返回首页</RouterLink>
    </div>

    <div class="admin-layout">
      <aside class="card admin-nav">
        <button
          v-for="item in tabs"
          :key="item.key"
          type="button"
          class="admin-nav__item"
          :class="{ 'is-active': activeTab === item.key }"
          @click="activeTab = item.key"
        >
          <span class="admin-nav__icon">{{ item.icon }}</span>
          <span class="admin-nav__text">
            <strong>{{ item.label }}</strong>
            <small>{{ item.desc }}</small>
          </span>
        </button>
      </aside>

      <section class="admin-content">
        <AdminDashboard v-if="activeTab === 'dashboard'" @navigate="activeTab = $event" />
        <AdminUsers v-else-if="activeTab === 'users'" />
        <AdminReview v-else-if="activeTab === 'review'" />
        <AdminNotes v-else-if="activeTab === 'notes'" />
        <AdminAiStats v-else-if="activeTab === 'ai'" />
      </section>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import AdminDashboard from '@/components/admin/AdminDashboard.vue'
import AdminUsers from '@/components/admin/AdminUsers.vue'
import AdminReview from '@/components/admin/AdminReview.vue'
import AdminNotes from '@/components/admin/AdminNotes.vue'
import AdminAiStats from '@/components/admin/AdminAiStats.vue'

export default {
  name: 'AdminView',
  components: { AdminDashboard, AdminUsers, AdminReview, AdminNotes, AdminAiStats },
  setup() {
    const activeTab = ref('dashboard')
    const tabs = [
      { key: 'dashboard', label: '概览', desc: '社区核心数据', icon: '▦' },
      { key: 'users', label: '用户管理', desc: '搜索与启用禁用', icon: '◉' },
      { key: 'review', label: '笔记审核', desc: '处理待审核公开笔记', icon: '✓' },
      { key: 'notes', label: '内容管理', desc: '筛选笔记与下架', icon: '☰' },
      { key: 'ai', label: 'AI 统计', desc: '调用量与成功率', icon: '✦' }
    ]

    return { activeTab, tabs }
  }
}
</script>

<style scoped>
.admin-page {
  max-width: 1180px;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
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

.admin-layout {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  position: sticky;
  top: 90px;
}

.admin-nav__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.admin-nav__item:hover {
  background: var(--surface-2);
}

.admin-nav__item.is-active {
  border-color: #d8e4ff;
  background: var(--primary-softer);
}

.admin-nav__icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 14px;
}

.admin-nav__item.is-active .admin-nav__icon {
  background: var(--primary-soft);
  color: var(--primary);
}

.admin-nav__text {
  min-width: 0;
}

.admin-nav__text strong {
  display: block;
  color: var(--text-2);
  font-size: 12px;
}

.admin-nav__text small {
  display: block;
  margin-top: 1px;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.4;
}

.admin-content {
  min-width: 0;
}

@media (max-width: 860px) {
  .admin-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .admin-nav {
    position: static;
    flex-direction: row;
    overflow-x: auto;
  }

  .admin-nav__item {
    flex: none;
  }

  .admin-nav__text small {
    display: none;
  }
}

@media (max-width: 620px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
