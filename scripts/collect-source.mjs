// 把项目源码按模块汇编成 Markdown，便于通读/打印/答辩翻阅
// 用法：node scripts/collect-source.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const OUT = 'docs/源码汇编';
mkdirSync(OUT, { recursive: true });

const IGNORE = new Set(['node_modules', 'target', 'dist', 'static', 'uploads', '.git', '.idea', '.ui-check', 'docs']);
const LANG = {
  '.java': 'java', '.js': 'javascript', '.mjs': 'javascript', '.vue': 'vue',
  '.sql': 'sql', '.yml': 'yaml', '.yaml': 'yaml', '.xml': 'xml',
  '.json': 'json', '.css': 'css', '.md': 'markdown', '.ps1': 'powershell', '.cmd': 'bat',
};

function walk(dir, acc = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (IGNORE.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const groups = [
  {
    file: '01-后端.md',
    title: '后端 Java 源码',
    desc: 'Spring Boot 启动、通用、安全、业务模块，共 9 个包。',
    roots: ['src/main/java'],
    files: ['src/main/resources/application.yml'],
  },
  {
    file: '02-前端.md',
    title: '前端源码（Vue 3 + Vue CLI）',
    desc: '入口、路由、状态、请求封装、11 个视图与 7 个组件。',
    roots: ['frontend/src'],
    files: ['frontend/vue.config.js', 'frontend/package.json'],
  },
  {
    file: '03-数据库与脚本.md',
    title: '数据库与测试脚本',
    desc: '建表/升级 SQL、接口测试、UI 检查、文档生成脚本。',
    roots: ['sql', 'scripts'],
    files: ['pom.xml', '.gitignore'],
  },
];

let totalFiles = 0;
let totalLines = 0;
const summary = [];

for (const g of groups) {
  const items = [];
  for (const r of g.roots || []) {
    for (const f of walk(join(ROOT, r))) {
      if (g.file === '03' && /package-lock\.json$/.test(f)) continue;
      if (/package-lock\.json$/.test(f)) continue;
      items.push(f);
    }
  }
  for (const f of g.files || []) {
    try { if (statSync(join(ROOT, f)).isFile()) items.push(join(ROOT, f)); } catch { /* ignore */ }
  }
  items.sort((a, b) => relative(ROOT, a).localeCompare(relative(ROOT, b)));

  const parts = [];
  let lines = 0;
  parts.push(`# ${g.title}`, '', `> ${g.desc}`, `> 共 ${items.length} 个文件`, '');

  // TOC
  parts.push('## 文件清单', '', '| # | 文件 | 行数 |', '| --- | --- | --- |');
  items.forEach((f, i) => {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    const n = readFileSync(f, 'utf8').split('\n').length;
    lines += n;
    parts.push(`| ${i + 1} | \`${rel}\` | ${n} |`);
  });
  parts.push('');

  // bodies
  for (const f of items) {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    const code = readFileSync(f, 'utf8').replace(/\r\n/g, '\n').replace(/\s+$/, '');
    const lang = LANG[extname(f).toLowerCase()] || 'text';
    parts.push('---', '', `### ${rel}`, '', '```' + lang, code, '```', '');
  }

  writeFileSync(join(OUT, g.file), parts.join('\n'), 'utf8');
  summary.push({ title: g.title, file: g.file, files: items.length, lines });
  totalFiles += items.length;
  totalLines += lines;
}

const index = [
  '# 项目源码汇编 · 总览',
  '',
  '> 由 `scripts/collect-source.mjs` 自动生成，按模块汇编全部源码，便于通读、打印和答辩翻阅。',
  '',
  '## 分册',
  '',
  '| 分册 | 内容 | 文件数 | 行数 |',
  '| --- | --- | --- | --- |',
  ...summary.map((s) => `| [${s.title}](${encodeURI(s.file)}) | ${s.file} | ${s.files} | ${s.lines} |`),
  `| **合计** | — | **${totalFiles}** | **${totalLines}** |`,
  '',
  '## 建议阅读顺序（答辩向）',
  '',
  '1. 先看 `01-后端.md` 的 `security/`、`note/NoteService.java`、`comment/CommentService.java`；',
  '2. 再看 `03-数据库与脚本.md` 的 `sql/schema.sql`，对照表结构；',
  '3. 前端只看 `02-前端.md` 的 `api/index.js`、`router/index.js`，其余页面按需查；',
  '4. 测试脚本看 `03` 里的 `scripts/api-test.mjs`，对应 56 个用例。',
  '',
  '## 说明',
  '',
  '- 已排除：`node_modules`、`target`、`dist`、`static`（前端构建产物）、`uploads`、`.git`、`docs`；',
  '- 每册开头有文件清单（含行数），正文按路径排序；',
  '- 重新生成：`node scripts/collect-source.mjs`。',
].join('\n');

writeFileSync(join(OUT, '00-总览.md'), index, 'utf8');
console.log(`生成完成：${totalFiles} 个文件，${totalLines} 行`);
for (const s of summary) console.log(` - ${OUT}/${s.file}  ${s.files} 文件 / ${s.lines} 行`);
