export const NOTE_STATUS = {
  1: { label: '已发布', tone: 'success', hint: '笔记已发布' },
  2: { label: '待审核', tone: 'warning', hint: '公开笔记正在等待管理员审核' },
  3: { label: '已驳回', tone: 'danger', hint: '公开笔记未通过审核' },
  0: { label: '已下架', tone: 'muted', hint: '笔记已被管理员下架' }
}

export const AI_TYPE_LABEL = {
  SUMMARY: '内容总结',
  AUDIENCE: '适合人群',
  SCORE: '质量评分'
}

export function noteStatusMeta(status) {
  return NOTE_STATUS[status] || { label: '未知', tone: 'muted', hint: '' }
}

export function aiTypeLabel(type) {
  if (!type) return 'AI 辅助'
  return AI_TYPE_LABEL[type] || type
}

function pad(value) {
  return String(value).padStart(2, '0')
}

export function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

export function timeAgo(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const diff = Date.now() - date.getTime()
  if (diff < 0) return formatDate(value)
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 30 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)} 天前`
  return formatDate(value)
}

export function excerpt(text, length = 110) {
  const value = String(text || '').replace(/\s+/g, ' ').trim()
  if (!value) return '这篇笔记还没有正文。'
  return value.length > length ? `${value.slice(0, length)}…` : value
}

export function mediaUrl(url) {
  const value = String(url || '').trim()
  if (!value) return ''
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value
  }
  return value.startsWith('/') ? value : `/${value}`
}

export function displayName(user) {
  if (!user) return '匿名用户'
  return user.nickname || user.username || '匿名用户'
}

export function countComments(list) {
  if (!Array.isArray(list)) return 0
  return list.reduce((sum, item) => sum + 1 + countComments(item.children), 0)
}

export function flattenReplies(children) {
  const result = []
  const walk = (items) => {
    if (!Array.isArray(items)) return
    items.forEach((item) => {
      result.push(item)
      walk(item.children)
    })
  }
  walk(children)
  return result
}
