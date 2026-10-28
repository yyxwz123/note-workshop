// 生成可点击跳转的代码地图 HTML：模块导航 + 关键方法直达行号 + 源码逐行锚点
// 用法：node scripts/export-code-map-html.mjs
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const OUT = 'docs/代码地图.html';
const VSCODE = 'vscode://file/';

const MODULES = [
  { id: 'common', title: 'common · 通用', desc: '统一响应、分页、异常', dir: 'src/main/java/com/noteworkshop/common' },
  { id: 'config', title: 'config · 配置', desc: '拦截器、CORS、分页插件、OpenAPI、初始化、SPA 回退', dir: 'src/main/java/com/noteworkshop/config' },
  { id: 'security', title: 'security · 安全', desc: 'JWT、登录拦截、管理员拦截、用户上下文', dir: 'src/main/java/com/noteworkshop/security' },
  { id: 'user', title: 'user · 用户', desc: '注册登录、资料', dir: 'src/main/java/com/noteworkshop/user' },
  { id: 'note', title: 'note · 笔记', desc: 'CRUD、公开流、点赞、详情', dir: 'src/main/java/com/noteworkshop/note' },
  { id: 'comment', title: 'comment · 评论', desc: '评论树、回复、级联逻辑删除', dir: 'src/main/java/com/noteworkshop/comment' },
  { id: 'follow', title: 'follow · 关注', desc: '关注、粉丝、热门作者', dir: 'src/main/java/com/noteworkshop/follow' },
  { id: 'admin', title: 'admin · 管理后台', desc: '概览、用户、审核、下架、AI 统计', dir: 'src/main/java/com/noteworkshop/admin' },
  { id: 'ai', title: 'ai · AI 助手', desc: '阅读辅助、客服、调用日志', dir: 'src/main/java/com/noteworkshop/ai' },
  { id: 'file', title: 'file · 文件上传', desc: '图片校验与存储', dir: 'src/main/java/com/noteworkshop/file' },
  { id: 'fe-api', title: '前端 · api', desc: 'axios 封装与拦截器', dir: 'frontend/src/api' },
  { id: 'fe-store', title: '前端 · store', desc: '登录态与全局提示', dir: 'frontend/src/store' },
  { id: 'fe-router', title: '前端 · router', desc: '路由与守卫', dir: 'frontend/src/router' },
  { id: 'fe-views', title: '前端 · views', desc: '11 个页面', dir: 'frontend/src/views' },
  { id: 'fe-components', title: '前端 · components', desc: '通用组件与后台页签', dir: 'frontend/src/components' },
  { id: 'fe-root', title: '前端 · 入口', desc: 'main.js / App.vue / 样式', dir: 'frontend/src', onlyFiles: true },
  { id: 'sql', title: '数据库', desc: '建表与升级脚本', dir: 'sql' },
  { id: 'scripts', title: '脚本', desc: '测试、文档生成', dir: 'scripts', skipDirs: ['node_modules'] },
];

const EXTRA_FILES = [
  'pom.xml',
  'src/main/resources/application.yml',
  'frontend/vue.config.js',
  'frontend/package.json',
];

const METHODS = [
  ['JwtUtil.issue', 'src/main/java/com/noteworkshop/security/JwtUtil.java', 25],
  ['JwtUtil.parse', 'src/main/java/com/noteworkshop/security/JwtUtil.java', 36],
  ['AuthInterceptor.preHandle', 'src/main/java/com/noteworkshop/security/AuthInterceptor.java', 17],
  ['AdminInterceptor.preHandle', 'src/main/java/com/noteworkshop/security/AdminInterceptor.java', 19],
  ['WebMvcConfig.addInterceptors', 'src/main/java/com/noteworkshop/config/WebMvcConfig.java', 30],
  ['WebMvcConfig.addCorsMappings', 'src/main/java/com/noteworkshop/config/WebMvcConfig.java', 46],
  ['UserService.register', 'src/main/java/com/noteworkshop/user/UserService.java', 27],
  ['UserService.login', 'src/main/java/com/noteworkshop/user/UserService.java', 45],
  ['NoteService.create', 'src/main/java/com/noteworkshop/note/NoteService.java', 44],
  ['NoteService.update', 'src/main/java/com/noteworkshop/note/NoteService.java', 61],
  ['NoteService.detail', 'src/main/java/com/noteworkshop/note/NoteService.java', 120],
  ['NoteService.toggleLike', 'src/main/java/com/noteworkshop/note/NoteService.java', 149],
  ['NoteService.listPublic', 'src/main/java/com/noteworkshop/note/NoteService.java', 95],
  ['CommentService.add', 'src/main/java/com/noteworkshop/comment/CommentService.java', 76],
  ['CommentService.removeCascade', 'src/main/java/com/noteworkshop/comment/CommentService.java', 140],
  ['FollowService.hotAuthors', 'src/main/java/com/noteworkshop/follow/FollowService.java', 98],
  ['AdminService.review', 'src/main/java/com/noteworkshop/admin/AdminService.java', 98],
  ['AdminService.takeDown', 'src/main/java/com/noteworkshop/admin/AdminService.java', 114],
  ['AiService.generate', 'src/main/java/com/noteworkshop/ai/AiService.java', 59],
  ['AiService.chat', 'src/main/java/com/noteworkshop/ai/AiService.java', 115],
  ['AiService.callAi', 'src/main/java/com/noteworkshop/ai/AiService.java', 200],
  ['GlobalExceptionHandler', 'src/main/java/com/noteworkshop/common/GlobalExceptionHandler.java', 15],
  ['前端请求拦截器', 'frontend/src/api/index.js', 23],
  ['前端响应拦截器', 'frontend/src/api/index.js', 35],
  ['前端路由守卫', 'frontend/src/router/index.js', 89],
];

const IGNORE = new Set(['node_modules', 'target', 'dist', 'static', 'uploads', '.git', '.idea', '.ui-check']);
const LANG = { '.java': 'java', '.js': 'javascript', '.vue': 'vue', '.sql': 'sql', '.yml': 'yaml', '.yaml': 'yaml', '.xml': 'xml', '.json': 'json', '.css': 'css', '.ps1': 'powershell', '.cmd': 'bat', '.md': 'markdown' };

function walk(dir, acc = [], skipDirs = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(e.name) || skipDirs.includes(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, acc, skipDirs);
    else acc.push(full);
  }
  return acc;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const vscode = (rel, line = 1) => VSCODE + encodeURI(join(ROOT, rel).replace(/\\/g, '/')) + ':' + line;

const fileId = new Map();
let counter = 0;
const sections = [];

for (const mod of MODULES) {
  const dirAbs = join(ROOT, mod.dir);
  let files = walk(dirAbs, [], mod.skipDirs || []);
  if (mod.onlyFiles) files = files.filter((f) => !f.includes(`${'\\'}views`) && !f.includes('\\components') && !f.includes('\\api') && !f.includes('\\store') && !f.includes('\\router'));
  files.sort((a, b) => relative(ROOT, a).localeCompare(relative(ROOT, b)));

  const fileBlocks = [];
  for (const abs of files) {
    const rel = relative(ROOT, abs).replace(/\\/g, '/');
    const id = `f${++counter}`;
    fileId.set(rel, id);
    let text = readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
    if (text.length > 200000) text = text.slice(0, 200000) + '\n/* ... truncated ... */';
    const lines = text.split('\n');
    const code = lines.map((line, i) => {
      const n = i + 1;
      return `<div class="line" id="${id}-L${n}"><a class="no" href="#${id}-L${n}">${n}</a><span class="src">${esc(line) || ' '}</span></div>`;
    }).join('');
    const name = rel.split('/').pop();
    fileBlocks.push(`<details class="file" id="${id}" data-path="${esc(rel)}">
  <summary>
    <span class="fname">${esc(name)}</span>
    <span class="floc">${esc(rel)}</span>
    <span class="flines">${lines.length} 行</span>
    <a class="editor" href="${vscode(rel, 1)}" onclick="event.stopPropagation()">VS Code 打开</a>
  </summary>
  <div class="code">${code}</div>
</details>`);
  }

  const modulePaths = new Set(files.map((f) => relative(ROOT, f).replace(/\\/g, '/')));
  const chips = METHODS.filter(([, path]) => modulePaths.has(path)).map(([label, path, line]) => {
    const id = fileId.get(path);
    return `<a class="chip" href="#${id}-L${line}" data-editor="${vscode(path, line)}">${esc(label)} <span>L${line}</span></a>`;
  }).join('');

  sections.push(`<section class="module" id="m-${mod.id}">
  <h2>${esc(mod.title)}<span class="desc">${esc(mod.desc)}</span></h2>
  ${chips ? `<div class="chips">${chips}</div>` : ''}
  ${fileBlocks.join('\n')}
</section>`);
}

// 额外配置文件
const extraBlocks = EXTRA_FILES.map((rel) => {
  const abs = join(ROOT, rel);
  if (!statSync(abs, { throwIfNoEntry: false })) return '';
  const id = `f${++counter}`;
  fileId.set(rel, id);
  const text = readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const code = lines.map((line, i) => {
    const n = i + 1;
    return `<div class="line" id="${id}-L${n}"><a class="no" href="#${id}-L${n}">${n}</a><span class="src">${esc(line) || ' '}</span></div>`;
  }).join('');
  return `<details class="file" id="${id}" data-path="${esc(rel)}">
  <summary><span class="fname">${esc(rel.split('/').pop())}</span><span class="floc">${esc(rel)}</span><span class="flines">${lines.length} 行</span>
  <a class="editor" href="${vscode(rel, 1)}" onclick="event.stopPropagation()">VS Code 打开</a></summary>
  <div class="code">${code}</div>
</details>`;
}).join('\n');

sections.push(`<section class="module" id="m-config-files"><h2>配置文件<span class="desc">pom / application.yml / vue.config.js / package.json</span></h2>${extraBlocks}</section>`);

const nav = MODULES.map((m) => `<a href="#m-${m.id}">${esc(m.title.split(' · ')[1] || m.title)}</a>`).join('') + '<a href="#m-config-files">配置</a>';

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Note-Workshop 代码地图</title>
<style>
  :root{--bg:#f5f6fa;--card:#fff;--line:#e5e8ef;--text:#1f2430;--muted:#78808f;--primary:#3b6ef6}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font:14px/1.6 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif}
  header{background:linear-gradient(135deg,#3b6ef6,#6f8cff);color:#fff;padding:20px 28px;position:sticky;top:0;z-index:20}
  header h1{margin:0 0 4px;font-size:20px}
  header p{margin:0;font-size:12px;opacity:.92}
  .toolbar{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
  .toolbar input{flex:1;min-width:220px;padding:7px 12px;border-radius:8px;border:0;font-size:13px}
  .toolbar button{padding:7px 12px;border-radius:8px;border:0;background:rgba(255,255,255,.2);color:#fff;font-size:12px;cursor:pointer}
  nav{display:flex;gap:6px;flex-wrap:wrap;padding:10px 28px;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:86px;z-index:15}
  nav a{color:var(--primary);text-decoration:none;background:#f2f5ff;border:1px solid #dbe3ff;border-radius:999px;padding:3px 10px;font-size:12px}
  main{max-width:1280px;margin:18px auto 60px;padding:0 18px}
  .module{margin-bottom:22px}
  .module h2{font-size:17px;margin:0 0 8px;padding-bottom:6px;border-bottom:1px solid var(--line)}
  .desc{color:var(--muted);font-size:12px;font-weight:400;margin-left:8px}
  .chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
  .chip{font-size:12px;text-decoration:none;color:#2c4fd0;background:#eef2ff;border:1px solid #dbe3ff;border-radius:999px;padding:2px 9px}
  .chip span{color:#8892b5;font-size:11px}
  details.file{background:var(--card);border:1px solid var(--line);border-radius:10px;margin-bottom:8px;overflow:hidden}
  details.file>summary{list-style:none;cursor:pointer;display:flex;gap:10px;align-items:center;padding:9px 12px;font-size:13px}
  details.file>summary::-webkit-details-marker{display:none}
  .fname{font-weight:600}
  .floc{color:var(--muted);font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .flines{color:#9aa2b1;font-size:11px}
  .editor{font-size:11px;color:#3b6ef6;text-decoration:none;border:1px solid #dbe3ff;border-radius:6px;padding:1px 7px;background:#f6f9ff}
  .code{background:#0f1420;color:#d6deeb;max-height:520px;overflow:auto;font:12px/1.55 Consolas,"Cascadia Code",monospace;padding:6px 0}
  .line{display:flex;white-space:pre}
  .line .no{width:56px;flex:none;text-align:right;padding-right:12px;color:#4b5878;text-decoration:none;user-select:none}
  .line .src{white-space:pre;padding-right:12px}
  .line:target{background:#24314d}
  .line:target .no{color:#8ab4ff}
  .line.hl{background:#24314d;transition:background 1.2s}
  .empty{color:var(--muted);padding:20px;text-align:center}
</style>
</head>
<body>
<header>
  <h1>Note-Workshop · 代码地图</h1>
  <p>点击模块跳转，点击方法直达行号；每行左侧行号可复制链接；右上角可用 VS Code 打开原文件。</p>
  <div class="toolbar">
    <input id="q" placeholder="搜索文件路径，例如 NoteService / comment / AiView">
    <button onclick="expandAll(true)">展开全部</button>
    <button onclick="expandAll(false)">收起全部</button>
  </div>
</header>
<nav>${nav}</nav>
<main>
${sections.join('\n')}
</main>
<script>
function expandAll(open){document.querySelectorAll('details.file').forEach(function(d){d.open=open;});}
function focusHash(){
  var h=location.hash.slice(1); if(!h) return;
  var el=document.getElementById(h); if(!el) return;
  var d=el.closest('details'); if(d) d.open=true;
  setTimeout(function(){
    el.scrollIntoView({block:'center'});
    el.classList.add('hl');
    setTimeout(function(){el.classList.remove('hl');},1600);
  },30);
}
window.addEventListener('hashchange',focusHash);
window.addEventListener('load',focusHash);
document.getElementById('q').addEventListener('input',function(e){
  var q=e.target.value.trim().toLowerCase();
  document.querySelectorAll('section.module').forEach(function(sec){
    var any=false;
    sec.querySelectorAll('details.file').forEach(function(d){
      var hit=!q||d.dataset.path.toLowerCase().indexOf(q)>-1;
      d.style.display=hit?'':'none'; if(hit) any=true;
    });
    sec.style.display=any?'':'none';
  });
});
</script>
</body>
</html>`;

writeFileSync(OUT, html, 'utf8');
console.log(`已生成 ${OUT}：${counter} 个文件，${(html.length / 1024 / 1024).toFixed(2)} MB`);
