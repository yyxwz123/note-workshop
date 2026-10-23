<template>
  <div class="app-shell">
    <NavBar />
    <main class="app-main">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="$route.fullPath" />
        </Transition>
      </RouterView>
    </main>
    <footer class="app-footer">
      <div class="container app-footer__inner">
        <span>笔记工坊 · 把读过的书，写成自己的答案</span>
        <span class="app-footer__meta">Vue 3 · Spring Boot</span>
      </div>
    </footer>
    <ToastHost />
  </div>
</template>

<script>
import { onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import ToastHost from '@/components/ToastHost.vue'
import auth from '@/store/auth'

export default {
  name: 'App',
  components: { NavBar, ToastHost },
  setup() {
    onMounted(() => {
      auth.bootstrap()
    })
  }
}
</script>
