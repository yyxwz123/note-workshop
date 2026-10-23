<template>
  <span
    class="avatar"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.4)}px` }"
    :title="name"
  >
    <img v-if="showImage" :src="resolvedSrc" :alt="name" @error="broken = true" />
    <span v-else class="avatar__initial">{{ initial }}</span>
  </span>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { mediaUrl } from '@/utils/format'

export default {
  name: 'UserAvatar',
  props: {
    src: { type: String, default: '' },
    name: { type: String, default: '' },
    size: { type: Number, default: 36 }
  },
  setup(props) {
    const broken = ref(false)
    const resolvedSrc = computed(() => mediaUrl(props.src))
    const showImage = computed(() => Boolean(props.src) && !broken.value)
    const initial = computed(() => {
      const value = (props.name || '用').trim()
      return value ? value.slice(0, 1).toUpperCase() : '用'
    })

    watch(
      () => props.src,
      () => {
        broken.value = false
      }
    )

    return { broken, resolvedSrc, showImage, initial }
  }
}
</script>

<style scoped>
.avatar {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  border: 1px solid #dbe4f6;
  background: linear-gradient(145deg, #e8efff, #d7e4ff);
  color: #2f5ee0;
  font-weight: 700;
  line-height: 1;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar__initial {
  transform: translateY(0.02em);
}
</style>
