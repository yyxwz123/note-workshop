// 笔记工坊 API 全量测试脚本（Node 22，原生 fetch）
// 用法：node scripts/api-test.mjs [baseUrl]
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const results = [];
const ctx = {};
const ts = Date.now().toString().slice(-6);

function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function call(method, path, { token, body, form, expectStatus } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  if (expectStatus && res.status !== expectStatus) {
    throw new Error(`HTTP ${res.status} != ${expectStatus}`);
  }
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* 非 JSON（如静态文件） */ }
  return { status: res.status, json, text };
}

async function t(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
    console.log(`  ✗ ${name}  -> ${e.message}`);
  }
}

async function main() {
  console.log(`\n=== 笔记工坊 API 测试 @ ${BASE} ===\n`);

  const u2 = `tester${ts}`;
  const pwd = '123456';

  await t('健康检查', async () => {
    const r = await call('GET', '/api/public/health');
    expect(r.json.code === 0 && r.json.data.status === 'UP', 'health 异常');
  });

  await t('注册新用户', async () => {
    const r = await call('POST', '/api/auth/register', { body: { username: u2, password: pwd, nickname: '测试用户' + ts } });
    expect(r.json.code === 0, r.json.message);
    expect(r.json.data.id, '未返回用户 id');
    ctx.u2id = r.json.data.id;
  });

  await t('重复注册被拒绝', async () => {
    const r = await call('POST', '/api/auth/register', { body: { username: u2, password: pwd } });
    expect(r.json.code === 400, `期望 400，实际 ${r.json.code}`);
  });

  await t('密码过短被参数校验拦截', async () => {
    const r = await call('POST', '/api/auth/register', { body: { username: `x${ts}`, password: '1' } });
    expect(r.json.code === 400, `期望 400，实际 ${r.json.code}`);
  });

  await t('登录成功并拿到 token', async () => {
    const r = await call('POST', '/api/auth/login', { body: { username: u2, password: pwd } });
    expect(r.json.code === 0, r.json.message);
    expect(r.json.data.token && r.json.data.token.split('.').length === 3, 'token 格式异常');
    ctx.token2 = r.json.data.token;
  });

  await t('错误密码登录失败', async () => {
    const r = await call('POST', '/api/auth/login', { body: { username: u2, password: 'wrong-pass' } });
    expect(r.json.code === 401, `期望 401，实际 ${r.json.code}`);
  });

  await t('未登录访问受保护接口返回 401', async () => {
    const r = await call('GET', '/api/users/me');
    expect(r.json.code === 401, `期望 401，实际 ${r.json.code}`);
  });

  await t('非法 token 返回 401', async () => {
    const r = await call('GET', '/api/users/me', { token: 'abc.def.ghi' });
    expect(r.json.code === 401, `期望 401，实际 ${r.json.code}`);
  });

  await t('查询当前用户', async () => {
    const r = await call('GET', '/api/users/me', { token: ctx.token2 });
    expect(r.json.code === 0 && r.json.data.username === u2, '用户信息不符');
    expect(r.json.data.password === undefined, '不应返回密码');
  });

  await t('修改个人资料', async () => {
    const r = await call('PUT', '/api/users/me', { token: ctx.token2, body: { nickname: '测试昵称', bio: '读书使人进步' } });
    expect(r.json.code === 0 && r.json.data.nickname === '测试昵称', '更新失败');
  });

  await t('上传图片并返回 URL', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const form = new FormData();
    form.append('file', new Blob([png], { type: 'image/png' }), 'test.png');
    const r = await call('POST', '/api/files/upload', { token: ctx.token2, form });
    expect(r.json.code === 0, r.json.message);
    expect(r.json.data.url.startsWith('/uploads/'), 'URL 异常');
    ctx.imageUrl = r.json.data.url;
  });

  await t('上传后的图片可访问', async () => {
    const res = await fetch(BASE + ctx.imageUrl);
    expect(res.status === 200, `期望 200，实际 ${res.status}`);
  });

  await t('拒绝非图片文件上传', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('hello')], { type: 'text/plain' }), 'a.txt');
    const r = await call('POST', '/api/files/upload', { token: ctx.token2, form });
    expect(r.json.code === 400, `期望 400，实际 ${r.json.code}`);
  });

  await t('创建私有笔记（直接可见）', async () => {
    const r = await call('POST', '/api/notes', {
      token: ctx.token2,
      body: { bookName: '私有书', title: '私有笔记', content: '只有我能看', isPublic: 0, images: [] }
    });
    expect(r.json.code === 0, r.json.message);
    expect(r.json.data.note.status === 1, `期望状态 1，实际 ${r.json.data.note.status}`);
    ctx.privateNoteId = r.json.data.note.id;
  });

  await t('创建公开笔记进入待审核', async () => {
    const r = await call('POST', '/api/notes', {
      token: ctx.token2,
      body: { bookName: '深入理解计算机系统', title: 'CSAPP 第三章', content: '栈帧与过程调用。', isPublic: 1, images: [ctx.imageUrl] }
    });
    expect(r.json.code === 0, r.json.message);
    expect(r.json.data.note.status === 2, `期望待审核 2，实际 ${r.json.data.note.status}`);
    expect(r.json.data.images.length === 1, '配图未保存');
    ctx.noteId = r.json.data.note.id;
  });

  await t('待审核笔记不出现在公开列表', async () => {
    const r = await call('GET', '/api/public/notes?page=1&size=50');
    expect(r.json.code === 0, r.json.message);
    expect(!r.json.data.records.some(n => n.id === ctx.noteId), '待审核笔记泄露到公开列表');
  });

  await t('我的笔记包含待审核笔记', async () => {
    const r = await call('GET', '/api/notes/mine?page=1&size=50', { token: ctx.token2 });
    expect(r.json.code === 0 && r.json.data.records.some(n => n.id === ctx.noteId), '我的笔记缺少该笔记');
  });

  await t('管理员登录', async () => {
    const r = await call('POST', '/api/auth/login', { body: { username: 'admin', password: 'admin123' } });
    expect(r.json.code === 0, r.json.message);
    ctx.adminToken = r.json.data.token;
  });

  await t('普通用户访问管理后台返回 403', async () => {
    const r = await call('GET', '/api/admin/dashboard', { token: ctx.token2 });
    expect(r.json.code === 403, `期望 403，实际 ${r.json.code}`);
  });

  await t('管理员查看待审核列表', async () => {
    const r = await call('GET', '/api/admin/notes/pending?page=1&size=50', { token: ctx.adminToken });
    expect(r.json.code === 0 && r.json.data.records.some(n => n.id === ctx.noteId), '待审核列表缺少笔记');
  });

  await t('管理员审核通过', async () => {
    const r = await call('POST', `/api/admin/notes/${ctx.noteId}/review`, {
      token: ctx.adminToken, body: { approved: true }
    });
    expect(r.json.code === 0, r.json.message);
  });

  await t('审核通过后出现在公开列表', async () => {
    const r = await call('GET', '/api/public/notes?page=1&size=50');
    expect(r.json.data.records.some(n => n.id === ctx.noteId), '公开列表缺少已审核笔记');
  });

  await t('公开详情返回配图', async () => {
    const r = await call('GET', `/api/public/notes/${ctx.noteId}`);
    expect(r.json.code === 0, r.json.message);
    expect(r.json.data.images.length === 1, '配图数量不符');
    expect(r.json.data.note.authorName, '缺少作者昵称');
  });

  await t('非作者不能编辑他人笔记', async () => {
    const r = await call('PUT', `/api/notes/${ctx.noteId}`, {
      token: ctx.token2, body: { bookName: 'x', title: 'x', content: 'x', isPublic: 1 }
    });
    // 自己就是作者，这里改用另一个用户
    const r2 = await call('POST', '/api/auth/register', { body: { username: `other${ts}`, password: pwd } });
    expect(r2.json.code === 0, r2.json.message);
    const login = await call('POST', '/api/auth/login', { body: { username: `other${ts}`, password: pwd } });
    const r3 = await call('PUT', `/api/notes/${ctx.noteId}`, {
      token: login.json.data.token, body: { bookName: 'x', title: 'x', content: 'x', isPublic: 1 }
    });
    expect(r3.json.code === 403, `期望 403，实际 ${r3.json.code}`);
  });

  await t('修改公开笔记后重新进入待审核', async () => {
    const r = await call('PUT', `/api/notes/${ctx.noteId}`, {
      token: ctx.token2,
      body: { bookName: '深入理解计算机系统', title: 'CSAPP 第三章（修订）', content: '补充了寄存器分配。', isPublic: 1, images: [] }
    });
    expect(r.json.code === 0, r.json.message);
    expect(r.json.data.note.status === 2, `期望 2，实际 ${r.json.data.note.status}`);
  });

  await t('管理员驳回并给出原因', async () => {
    const r = await call('POST', `/api/admin/notes/${ctx.noteId}/review`, {
      token: ctx.adminToken, body: { approved: false, reason: '内容过于简略' }
    });
    expect(r.json.code === 0, r.json.message);
    const mine = await call('GET', '/api/notes/mine?page=1&size=50', { token: ctx.token2 });
    const note = mine.json.data.records.find(n => n.id === ctx.noteId);
    expect(note.status === 3, `期望 3，实际 ${note.status}`);
    expect(note.rejectReason === '内容过于简略', '驳回原因缺失');
  });

  await t('驳回后重新提交并审核通过', async () => {
    await call('PUT', `/api/notes/${ctx.noteId}`, {
      token: ctx.token2,
      body: { bookName: '深入理解计算机系统', title: 'CSAPP 第三章（终稿）', content: '完整内容：栈帧、寄存器、调用约定。', isPublic: 1, images: [] }
    });
    const r = await call('POST', `/api/admin/notes/${ctx.noteId}/review`, { token: ctx.adminToken, body: { approved: true } });
    expect(r.json.code === 0, r.json.message);
  });

  await t('点赞', async () => {
    const r = await call('POST', `/api/notes/${ctx.noteId}/like`, { token: ctx.token2 });
    expect(r.json.code === 0 && r.json.data.liked === true, '点赞失败');
    expect(r.json.data.likeCount >= 1, '点赞数未增加');
  });

  await t('取消点赞', async () => {
    const r = await call('POST', `/api/notes/${ctx.noteId}/like`, { token: ctx.token2 });
    expect(r.json.data.liked === false, '取消点赞失败');
  });

  await t('我点赞的列表', async () => {
    await call('POST', `/api/notes/${ctx.noteId}/like`, { token: ctx.token2 });
    const r = await call('GET', '/api/notes/liked?page=1&size=20', { token: ctx.token2 });
    expect(r.json.code === 0 && r.json.data.records.some(n => n.id === ctx.noteId), '点赞列表缺少笔记');
  });

  await t('发表评论', async () => {
    const r = await call('POST', `/api/notes/${ctx.noteId}/comments`, {
      token: ctx.token2, body: { content: '写得很清楚！' }
    });
    expect(r.json.code === 0, r.json.message);
    ctx.commentId = r.json.data.id;
  });

  await t('回复评论（二级）', async () => {
    const r = await call('POST', `/api/notes/${ctx.noteId}/comments`, {
      token: ctx.token2, body: { content: '补充一点：栈帧还和调试有关。', parentId: ctx.commentId }
    });
    expect(r.json.code === 0, r.json.message);
    ctx.replyId = r.json.data.id;
  });

  await t('评论树包含子回复', async () => {
    const r = await call('GET', `/api/public/notes/${ctx.noteId}/comments`);
    expect(r.json.code === 0, r.json.message);
    const root = r.json.data.find(c => c.id === ctx.commentId);
    expect(root && root.children.length === 1, '子回复缺失');
  });

  await t('删除父评论级联删除子评论', async () => {
    const r = await call('DELETE', `/api/comments/${ctx.commentId}`, { token: ctx.token2 });
    expect(r.json.code === 0, r.json.message);
    const list = await call('GET', `/api/public/notes/${ctx.noteId}/comments`);
    expect(list.json.data.length === 0, '评论未被级联删除');
  });

  await t('关注作者', async () => {
    // user2 关注 demo01（id=1）
    const r = await call('POST', '/api/users/1/follow', { token: ctx.token2 });
    expect(r.json.code === 0 && r.json.data.followed === true, '关注失败');
  });

  await t('作者主页粉丝数正确', async () => {
    const r = await call('GET', '/api/public/users/1');
    expect(r.json.code === 0 && r.json.data.fansCount >= 1, '粉丝数不正确');
  });

  await t('粉丝列表', async () => {
    const r = await call('GET', '/api/users/1/followers?page=1&size=10', { token: ctx.token2 });
    expect(r.json.code === 0 && r.json.data.records.some(u => u.username === u2), '粉丝列表缺少用户');
  });

  await t('关注列表', async () => {
    const r = await call('GET', `/api/users/${ctx.u2id}/following?page=1&size=10`, { token: ctx.token2 });
    expect(r.json.code === 0 && r.json.data.records.some(u => u.id === 1), '关注列表缺少作者');
  });

  await t('热门作者排行', async () => {
    const r = await call('GET', '/api/public/authors/hot?limit=10');
    expect(r.json.code === 0, r.json.message);
    expect(Array.isArray(r.json.data), '返回格式错误');
  });

  await t('不能关注自己', async () => {
    const r = await call('POST', `/api/users/${ctx.u2id}/follow`, { token: ctx.token2 });
    expect(r.json.code === 400, `期望 400，实际 ${r.json.code}`);
  });

  await t('取消关注', async () => {
    const r = await call('DELETE', '/api/users/1/follow', { token: ctx.token2 });
    expect(r.json.code === 0 && r.json.data.followed === false, '取消关注失败');
  });

  await t('作者公开笔记列表', async () => {
    const r = await call('GET', `/api/public/users/${ctx.u2id}/notes?page=1&size=10`);
    expect(r.json.code === 0, r.json.message);
  });

  await t('管理后台统计', async () => {
    const r = await call('GET', '/api/admin/dashboard', { token: ctx.adminToken });
    expect(r.json.code === 0 && typeof r.json.data.userCount === 'number', '统计数据异常');
  });

  await t('管理员用户列表与搜索', async () => {
    const r = await call('GET', `/api/admin/users?page=1&size=10&keyword=${u2}`, { token: ctx.adminToken });
    expect(r.json.code === 0 && r.json.data.records.some(u => u.username === u2), '搜索结果缺少用户');
  });

  await t('禁用用户后无法登录', async () => {
    await call('PUT', `/api/admin/users/${ctx.u2id}/status?status=0`, { token: ctx.adminToken });
    const r = await call('POST', '/api/auth/login', { body: { username: u2, password: pwd } });
    expect(r.json.code === 403, `期望 403，实际 ${r.json.code}`);
  });

  await t('恢复用户后可登录', async () => {
    await call('PUT', `/api/admin/users/${ctx.u2id}/status?status=1`, { token: ctx.adminToken });
    const r = await call('POST', '/api/auth/login', { body: { username: u2, password: pwd } });
    expect(r.json.code === 0, r.json.message);
    ctx.token2 = r.json.data.token;
  });

  await t('管理员按状态筛选笔记', async () => {
    const r = await call('GET', '/api/admin/notes?page=1&size=20&status=1', { token: ctx.adminToken });
    expect(r.json.code === 0, r.json.message);
  });

  await t('管理员删除违规评论', async () => {
    const c = await call('POST', `/api/notes/${ctx.noteId}/comments`, { token: ctx.token2, body: { content: '违规内容' } });
    const r = await call('DELETE', `/api/admin/comments/${c.json.data.id}`, { token: ctx.adminToken });
    expect(r.json.code === 0, r.json.message);
  });

  await t('AI 状态接口', async () => {
    const r = await call('GET', '/api/ai/status', { token: ctx.token2 });
    expect(r.json.code === 0 && Array.isArray(r.json.data.scenes), '状态异常');
  });

  await t('AI 生成（无 Key 时优雅降级为 503）', async () => {
    const r = await call('POST', `/api/ai/notes/${ctx.noteId}/generate`, { token: ctx.token2, body: { type: 'SUMMARY' } });
    expect([0, 503].includes(r.json.code), `期望 0 或 503，实际 ${r.json.code}`);
    ctx.aiCode = r.json.code;
    ctx.aiContent = r.json.data?.content;
  });

  await t('AI 客服（无 Key 时优雅降级为 503）', async () => {
    const r = await call('POST', '/api/ai/chat', { token: ctx.token2, body: { message: '怎么把笔记设为公开？' } });
    expect([0, 503].includes(r.json.code), `期望 0 或 503，实际 ${r.json.code}`);
  });

  await t('AI 会话列表', async () => {
    const r = await call('GET', '/api/ai/sessions', { token: ctx.token2 });
    expect(r.json.code === 0 && Array.isArray(r.json.data), '会话列表异常');
  });

  await t('保存 AI 结果到笔记', async () => {
    const content = ctx.aiContent || '【测试】这段是保存到笔记的 AI 摘要占位内容。';
    const r = await call('POST', `/api/ai/notes/${ctx.noteId}/save`, {
      token: ctx.token2, body: { type: 'SUMMARY', content }
    });
    expect(r.json.code === 0 && r.json.data.saved === true, r.json.message);
    const detail = await call('GET', `/api/notes/${ctx.noteId}`, { token: ctx.token2 });
    expect(detail.json.data.aiType === 'SUMMARY', '详情未返回 AI 类型');
    expect(detail.json.data.aiContent === content, '详情未返回 AI 内容');
  });

  await t('AI 统计接口', async () => {
    const r = await call('GET', '/api/admin/ai/stats', { token: ctx.adminToken });
    expect(r.json.code === 0 && typeof r.json.data.total === 'number', '统计异常');
  });

  await t('管理员下架笔记后公开访问 404', async () => {
    const r = await call('PUT', `/api/admin/notes/${ctx.noteId}/take-down`, { token: ctx.adminToken });
    expect(r.json.code === 0, r.json.message);
    const pub = await call('GET', `/api/public/notes/${ctx.noteId}`);
    expect(pub.json.code === 404, `期望 404，实际 ${pub.json.code}`);
  });

  await t('不存在的笔记返回 404', async () => {
    const r = await call('GET', '/api/public/notes/99999999');
    expect(r.json.code === 404, `期望 404，实际 ${r.json.code}`);
  });

  // 汇总
  const passed = results.filter(r => r.ok).length;
  const failed = results.length - passed;
  console.log(`\n=== 结果：${passed}/${results.length} 通过，${failed} 失败 ===\n`);

  const lines = [];
  lines.push('# 笔记工坊 API 测试报告', '');
  lines.push(`- 测试时间：${new Date().toLocaleString('zh-CN')}`);
  lines.push(`- 服务地址：${BASE}`);
  lines.push(`- 用例总数：${results.length}，通过：${passed}，失败：${failed}`, '');
  lines.push('| # | 用例 | 结果 | 说明 |');
  lines.push('|---|---|---|---|');
  results.forEach((r, i) => {
    lines.push(`| ${i + 1} | ${r.name} | ${r.ok ? '✅ 通过' : '❌ 失败'} | ${r.ok ? '' : (r.detail || '').replace(/\|/g, '\\|')} |`);
  });
  lines.push('');
  lines.push('> AI 相关用例在未配置 `AI_API_KEY` 时预期返回 503（表示服务未配置），属于优雅降级；配置真实 Key 后会返回 0。');
  mkdirSync('docs', { recursive: true });
  writeFileSync('docs/api-test-report.md', lines.join('\n'), 'utf8');
  console.log('报告已生成：docs/api-test-report.md');

  if (failed > 0) process.exitCode = 1;
}

main().catch(e => {
  console.error('测试脚本异常：', e);
  process.exit(2);
});
