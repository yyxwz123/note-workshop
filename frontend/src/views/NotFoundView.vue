<template>
  <div class="container notfound">
    <div class="card notfound__card">
      <span class="notfound__code">404</span>
      <h1>这一页还没有被写下</h1>
      <p>你访问的页面不存在，或者已经被删除了。回到首页继续寻找喜欢的读书笔记吧。</p>
      <div class="notfound__actions">
        <RouterLink to="/" class="btn btn-primary">返回首页</RouterLink>
        <button type="button" class="btn btn-outline" @click="$router.back()">返回上一页</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotFoundView'
}
</script>

<style scoped>
.notfound {
  display: flex;
  justify-content: center;
  padding-top: 36px;
}

.notfound__card {
  width: 100%;
  max-width: 560px;
  padding: 54px 40px;
  text-align: center;
}

.notfound__code {
  display: block;
  background: linear-gradient(110deg, #3b6ef6, #7a5cf0);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-size: 76px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.05em;
}

.notfound h1 {
  margin-top: 16px;
  font-size: 24px;
  letter-spacing: -0.03em;
}

.notfound p {
  margin-top: 10px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.8;
}

.notfound__actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 26px;
}
</style>
