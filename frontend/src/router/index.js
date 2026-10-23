import { createRouter, createWebHistory } from 'vue-router'
import auth from '@/store/auth'
import { notify } from '@/store/toast'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录', guestOnly: true }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { title: '注册', guestOnly: true }
  },
  {
    path: '/notes/new',
    name: 'note-new',
    component: () => import('@/views/NoteEditorView.vue'),
    meta: { title: '发布笔记', requiresAuth: true }
  },
  {
    path: '/notes/:id/edit',
    name: 'note-edit',
    component: () => import('@/views/NoteEditorView.vue'),
    meta: { title: '编辑笔记', requiresAuth: true }
  },
  {
    path: '/notes/:id',
    name: 'note-detail',
    component: () => import('@/views/NoteDetailView.vue'),
    meta: { title: '笔记详情' }
  },
  {
    path: '/me',
    name: 'my-notes',
    component: () => import('@/views/MyNotesView.vue'),
    meta: { title: '我的笔记', requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: '个人资料', requiresAuth: true }
  },
  {
    path: '/users/:id',
    name: 'user-profile',
    component: () => import('@/views/UserProfileView.vue'),
    meta: { title: '作者主页' }
  },
  {
    path: '/ai',
    name: 'ai',
    component: () => import('@/views/AiView.vue'),
    meta: { title: 'AI 助手', requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { title: '管理后台', requiresAuth: true, admin: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  }
})

router.beforeEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 笔记工坊` : '笔记工坊'

  if (to.meta.guestOnly && auth.isLoggedIn()) {
    return { name: 'home' }
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.admin && !auth.isAdmin()) {
    notify('无权访问管理后台，仅管理员可进入', 'error')
    return { name: 'home' }
  }

  return true
})

export default router
