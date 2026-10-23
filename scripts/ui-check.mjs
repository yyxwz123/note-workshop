// 浏览器端联调检查：真实渲染 Vue 页面，收集控制台错误并截图
// 用法：node scripts/ui-check.mjs [frontendBase] [apiBase]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const WEB = process.argv[2] || 'http://127.0.0.1:8081';
const API = process.argv[3] || 'http://127.0.0.1:8080';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const OUT = '.ui-check/shots';

mkdirSync(OUT, { recursive: true });

const results = [];
const consoleErrors = [];

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=zh-CN'],
});

async function newPage() {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[console] ${msg.text()}`);
  });
  page.on('pageerror', (err) => consoleErrors.push(`[pageerror] ${err.message}`));
  return page;
}

async function login(page, username, password) {
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle2' });
  const ok = await page.evaluate(async ({ username, password }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const body = await res.json();
    if (body.code !== 0) return body.message;
    localStorage.setItem('nw_token', body.data.token);
    localStorage.setItem('nw_user', JSON.stringify(body.data.user));
    return null;
  }, { username, password });
  if (ok) throw new Error('登录失败：' + ok);
}

async function visit(page, path, name, expectText) {
  const errorsBefore = consoleErrors.length;
  await page.goto(`${WEB}${path}`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));
  const info = await page.evaluate(() => ({
    title: document.title,
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 160),
    appHtmlLength: document.querySelector('#app')?.innerHTML.length || 0,
  }));
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  const newErrors = consoleErrors.slice(errorsBefore);
  const pass = info.appHtmlLength > 200 && (!expectText || info.text.includes(expectText)) && newErrors.length === 0;
  results.push({ path, name, pass, title: info.title, sample: info.text, errors: newErrors });
  console.log(`${pass ? '✓' : '✗'} ${path}  title="${info.title}"  app=${info.appHtmlLength}${newErrors.length ? '  errors=' + newErrors.length : ''}`);
}

const page = await newPage();
try {
  // 游客可访问
  await page.goto(`${WEB}/`, { waitUntil: 'networkidle2' });
  await visit(page, '/', '01-home', '笔记工坊');
  await visit(page, '/login', '02-login', '登录');
  await visit(page, '/register', '03-register', '注册');

  // 公开笔记详情（取接口里第一篇）
  const noteId = await page.evaluate(async () => {
    const res = await fetch('/api/public/notes?page=1&size=1');
    const body = await res.json();
    return body.data?.records?.[0]?.id || null;
  });
  if (noteId) await visit(page, `/notes/${noteId}`, '04-note-detail');

  // 普通用户
  await login(page, 'demo01', '123456');
  await visit(page, '/me', '05-my-notes', '我的笔记');
  await visit(page, '/notes/new', '06-note-editor', '笔记');
  await visit(page, '/profile', '07-profile');
  await visit(page, '/ai', '08-ai', 'AI');
  if (noteId) await visit(page, `/notes/${noteId}/edit`, '09-note-edit');

  // 管理员
  await login(page, 'admin', 'admin123');
  await visit(page, '/admin', '10-admin', '管理');
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n结果：${results.length - failed.length}/${results.length} 页面通过，控制台错误 ${consoleErrors.length} 条`);
if (failed.length) {
  console.log('失败页面：');
  failed.forEach((f) => console.log(` - ${f.path} errors=${JSON.stringify(f.errors)} sample="${f.sample}"`));
}
process.exitCode = failed.length ? 1 : 0;
