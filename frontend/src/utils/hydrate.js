import api from '@/api'

/**
 * 列表接口不返回配图，这里仅在缺少 images 时逐个补取详情，用于展示首图。
 * 失败时保持占位图，不影响列表主流程。
 */
export async function hydrateNoteCovers(notes, isStale = () => false) {
  if (!Array.isArray(notes)) return
  const missing = notes.filter(
    (note) => note && note.id && (!Array.isArray(note.images) || note.images.length === 0)
  )
  if (!missing.length) return

  await Promise.allSettled(
    missing.map(async (note) => {
      try {
        const detail = await api.get(`/api/public/notes/${note.id}`)
        if (!isStale() && detail) {
          note.images = Array.isArray(detail.images) ? detail.images : []
        }
      } catch (error) {
        if (!isStale()) note.images = []
      }
    })
  )
}
