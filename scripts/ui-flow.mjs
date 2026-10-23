// 真实用户流程联调：表单登录 → 发布笔记（进入待审核）→ 验证接口数据
// 用法：node scripts/ui-flow.mjs [frontendBase]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const WEB = process.argv[2] || 'http://127.0.0.1:8081';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const OUT = '.ui-check/shots';
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--lang=zh-CN'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));

let pass = true;
const check = (cond, msg) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) pass = false;
};

try {
  // 1. 表单登录
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle2' });
  await page.type('#login-username', 'demo01');
  await page.type('#login-password', '123456');
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForFunction(() => location.pathname === '/', { timeout: 15000 });
  const token = await page.evaluate(() => localStorage.getItem('nw_token'));
  check(Boolean(token), '表单登录成功并跳转首页，token 已写入 localStorage');

  // 2. 发布公开笔记
  const title = `联调测试笔记 ${Date.now()}`;
  await page.goto(`${WEB}/notes/new`, { waitUntil: 'networkidle2' });
  await page.type('#note-book', '联调测试书目');
  await page.type('#note-title', title);
  await page.type('#note-content', '这是通过浏览器真实表单提交的联调测试笔记内容。');
  await page.click('input[value="1"]');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/notes') && r.request().method() === 'POST', { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  const body = await resp.json();
  check(body.code === 0, `发布接口返回 code=0（${body.message}）`);

  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: `${OUT}/11-publish-flow.png` });

  // 3. 校验数据：新笔记状态应为待审核(2)
  const mine = await page.evaluate(async (title) => {
    const token = localStorage.getItem('nw_token');
    const res = await fetch('/api/notes/mine?page=1&size=20', { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    return body.data.records.find((n) => n.title === title) || null;
  }, title);
  check(Boolean(mine), '我的笔记接口能查到刚发布的笔记');
  check(mine && mine.status === 2, `新公开笔记状态为待审核（实际 ${mine && mine.status}）`);

  // 4. 校验公开列表不包含待审核笔记
  const inPublic = await page.evaluate(async (title) => {
    const res = await fetch('/api/public/notes?page=1&size=50');
    const body = await res.json();
    return body.data.records.some((n) => n.title === title);
  }, title);
  check(!inPublic, '待审核笔记未出现在公开列表');

  // 5. 退出登录
  await page.goto(`${WEB}/`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.removeItem('nw_token');
    localStorage.removeItem('nw_user');
  });
  const guestToken = await page.evaluate(() => localStorage.getItem('nw_token'));
  check(guestToken === null, '清除登录态后 localStorage 已无 token');
} catch (e) {
  console.error('流程异常：', e.message);
  pass = false;
} finally {
  await browser.close();
}

if (errors.length) {
  console.log(`控制台错误 ${errors.length} 条：`, errors.slice(0, 3));
  pass = false;
}
console.log(pass ? '\n联调流程全部通过' : '\n联调流程存在失败项');
process.exitCode = pass ? 0 : 1;
