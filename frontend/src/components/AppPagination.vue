<template>
  <nav v-if="totalPages > 1" class="pagination" aria-label="分页">
    <button
      class="pagination__btn"
      type="button"
      :disabled="page <= 1 || disabled"
      @click="go(page - 1)"
    >
      上一页
    </button>
    <template v-for="(item, index) in pages" :key="`${item}-${index}`">
      <span v-if="item === '...'" class="pagination__ellipsis">…</span>
      <button
        v-else
        class="pagination__btn"
        :class="{ 'is-active': item === page }"
        type="button"
        :disabled="disabled"
        @click="go(item)"
      >
        {{ item }}
      </button>
    </template>
    <button
      class="pagination__btn"
      type="button"
      :disabled="page >= totalPages || disabled"
      @click="go(page + 1)"
    >
      下一页
    </button>
    <span class="pagination__total">共 {{ total }} 条</span>
  </nav>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'AppPagination',
  props: {
    page: { type: Number, default: 1 },
    size: { type: Number, default: 10 },
    total: { type: Number, default: 0 },
    disabled: { type: Boolean, default: false }
  },
  emits: ['change'],
  setup(props, { emit }) {
    const totalPages = computed(() =>
      Math.max(1, Math.ceil((Number(props.total) || 0) / (Number(props.size) || 1)))
    )

    const pages = computed(() => {
      const last = totalPages.value
      if (last <= 7) {
        return Array.from({ length: last }, (_, index) => index + 1)
      }
      const list = [1]
      const start = Math.max(2, props.page - 1)
      const end = Math.min(last - 1, props.page + 1)
      if (start > 2) list.push('...')
      for (let i = start; i <= end; i += 1) list.push(i)
      if (end < last - 1) list.push('...')
      list.push(last)
      return list
    })

    function go(target) {
      if (props.disabled) return
      if (target < 1 || target > totalPages.value || target === props.page) return
      emit('change', target)
    }

    return { totalPages, pages, go }
  }
}
</script>
