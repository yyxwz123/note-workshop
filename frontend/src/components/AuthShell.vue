<template>
  <div class="container auth-page">
    <div class="auth-card">
      <aside class="auth-aside">
        <RouterLink to="/" class="auth-brand">
          <span class="auth-brand__mark">笔</span>
          <span>
            <strong>笔记工坊</strong>
            <small>NOTE WORKSHOP</small>
          </span>
        </RouterLink>

        <div class="auth-aside__body">
          <h2>让每一次阅读，<br />都留下回声。</h2>
          <p>
            记录书中的句子，也记录读书时的自己。公开分享，或只留给自己，都由你决定。
          </p>
          <ul class="auth-features">
            <li><span>✓</span> 公开笔记与人工审核，保持社区质量</li>
            <li><span>✓</span> AI 阅读辅助，总结、人群与评分</li>
            <li><span>✓</span> 关注喜欢的作者，收藏值得重读的想法</li>
          </ul>
        </div>

        <div class="auth-quote">
          <p>“ 我们读书，然后就不孤单。 ”</p>
          <small>— 笔记工坊</small>
        </div>

        <span class="auth-aside__circle auth-aside__circle--one"></span>
        <span class="auth-aside__circle auth-aside__circle--two"></span>
      </aside>

      <section class="auth-panel">
        <div class="auth-panel__head">
          <h1>{{ title }}</h1>
          <p>{{ subtitle }}</p>
        </div>
        <slot />
        <div class="auth-panel__footer">
          <slot name="footer" />
        </div>
      </section>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AuthShell',
  props: {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' }
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 240px);
  padding-top: 8px;
  padding-bottom: 8px;
}

.auth-card {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  width: 100%;
  max-width: 980px;
  min-height: 580px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 26px;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
}

.auth-aside {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 38px 38px 34px;
  overflow: hidden;
  background: radial-gradient(circle at 90% 5%, rgba(122, 92, 240, 0.55), transparent 48%),
    linear-gradient(155deg, #17264d 0%, #203a78 45%, #2f5ee0 100%);
  color: #fff;
}

.auth-brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.auth-brand__mark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 18px;
  font-weight: 800;
  backdrop-filter: blur(6px);
}

.auth-brand strong {
  display: block;
  font-size: 15px;
  line-height: 1.2;
}

.auth-brand small {
  display: block;
  margin-top: 3px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 8px;
  letter-spacing: 0.18em;
}

.auth-aside__body {
  position: relative;
  z-index: 1;
  margin-top: auto;
  padding-top: 52px;
}

.auth-aside__body h2 {
  font-size: clamp(27px, 3vw, 34px);
  line-height: 1.35;
  letter-spacing: -0.02em;
}

.auth-aside__body > p {
  margin-top: 14px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 13px;
  line-height: 1.85;
}

.auth-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 26px;
}

.auth-features li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  line-height: 1.6;
}

.auth-features span {
  flex: none;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  color: #cfe0ff;
  font-size: 10px;
  font-weight: 800;
}

.auth-quote {
  position: relative;
  z-index: 1;
  margin-top: auto;
  padding-top: 40px;
  color: rgba(255, 255, 255, 0.58);
  font-size: 12px;
}

.auth-quote small {
  display: block;
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.34);
}

.auth-aside__circle {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 50%;
  pointer-events: none;
}

.auth-aside__circle--one {
  top: -80px;
  right: -100px;
  width: 280px;
  height: 280px;
}

.auth-aside__circle--two {
  bottom: -120px;
  left: -90px;
  width: 260px;
  height: 260px;
  border-width: 34px;
  border-color: rgba(255, 255, 255, 0.05);
}

.auth-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px 56px;
}

.auth-panel__head {
  margin-bottom: 26px;
}

.auth-panel__head h1 {
  font-size: 27px;
  letter-spacing: -0.03em;
}

.auth-panel__head p {
  margin-top: 7px;
  color: var(--muted);
  font-size: 13px;
}

.auth-panel__footer {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.auth-panel__footer :deep(a) {
  color: var(--primary);
  font-weight: 600;
}

.auth-panel :deep(.btn-block) {
  margin-top: 4px;
}

@media (max-width: 880px) {
  .auth-card {
    grid-template-columns: minmax(0, 1fr);
    max-width: 480px;
    min-height: 0;
  }

  .auth-aside {
    display: none;
  }

  .auth-panel {
    padding: 36px 30px;
  }
}

@media (max-width: 480px) {
  .auth-panel {
    padding: 30px 22px;
  }
}
</style>
