<template>
  <div class="empty">
    <span class="empty__icon">{{ icon }}</span>
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <div v-if="$slots.default" class="empty__actions">
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  name: 'EmptyState',
  props: {
    icon: { type: String, default: '✦' },
    title: { type: String, default: '这里还没有内容' },
    description: { type: String, default: '' }
  }
}
</script>

<style scoped>
.empty__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
</style>
