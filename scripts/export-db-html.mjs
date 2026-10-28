// 导出数据库表结构为 HTML（浏览器可直接打开）
// 用法：node scripts/export-db-html.mjs
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const MYSQL = 'C:/dev/mysql-8.4.9-winx64/bin/mysql.exe';
const DB = 'note_workshop';
const OUT = 'docs/数据库表结构.html';

function query(sql) {
  const out = execFileSync(MYSQL, [
    '-u', 'root', '-p123456', '-h', '127.0.0.1',
    '--batch', '--raw', '--default-character-set=utf8mb4',
    DB, '-e', sql,
  ], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  const text = out.toString('utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');
  const lines = text.split('\n');
  if (lines.length <= 1) return [];
  const header = lines[0].split('\t');
  return lines.slice(1).filter(Boolean).map((line) => {
    const cells = line.split('\t');
    const row = {};
    header.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
}

const cols = query(
  `SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_KEY,IFNULL(COLUMN_DEFAULT,'') AS COL_DEFAULT,EXTRA,COLUMN_COMMENT
   FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='${DB}' ORDER BY TABLE_NAME,ORDINAL_POSITION`);

const idx = query(
  `SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS IDX_COLS
   FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='${DB}'
   GROUP BY TABLE_NAME,INDEX_NAME,NON_UNIQUE ORDER BY TABLE_NAME,INDEX_NAME`);

const tbls = query(
  `SELECT TABLE_NAME,TABLE_COMMENT,TABLE_ROWS
   FROM information_schema.TABLES WHERE TABLE_SCHEMA='${DB}' ORDER BY TABLE_NAME`);

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const keyTag = (k) => k === 'PRI' ? '<span class="tag pk">PK</span>'
  : k === 'UNI' ? '<span class="tag uk">UNI</span>'
  : k === 'MUL' ? '<span class="tag idx">IDX</span>' : '';

const sections = tbls.map((t) => {
  const name = t.TABLE_NAME;
  const tcols = cols.filter((c) => c.TABLE_NAME === name);
  const tidx = idx.filter((i) => i.TABLE_NAME === name);
  const rows = tcols.map((c, i) => `<tr>
      <td>${i + 1}</td>
      <td><code>${esc(c.COLUMN_NAME)}</code></td>
      <td><code>${esc(c.COLUMN_TYPE)}</code></td>
      <td>${esc(c.IS_NULLABLE)}</td>
      <td>${keyTag(c.COLUMN_KEY)}</td>
      <td>${esc(c.COL_DEFAULT)}</td>
      <td>${esc(c.COLUMN_COMMENT)}</td>
    </tr>`).join('\n');

  const idxRows = tidx.map((i) => `<tr>
      <td><code>${esc(i.INDEX_NAME)}</code></td>
      <td>${i.NON_UNIQUE === '0' ? '是' : '否'}</td>
      <td>${esc(i.IDX_COLS)}</td>
    </tr>`).join('\n');

  return `<section class="card" id="t-${name}">
  <h2>${esc(name)} <span class="sub">${esc(t.TABLE_COMMENT)}</span></h2>
  <div class="meta">约 ${esc(t.TABLE_ROWS)} 行（InnoDB 估算） · ${tcols.length} 个字段 · ${tidx.length} 个索引</div>
  <table>
    <thead><tr><th>#</th><th>字段</th><th>类型</th><th>可空</th><th>键</th><th>默认</th><th>说明</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="meta" style="margin-top:12px">索引</div>
  <table>
    <thead><tr><th>名称</th><th>唯一</th><th>字段</th></tr></thead>
    <tbody>${idxRows}</tbody>
  </table>
</section>`;
}).join('\n');

const nav = tbls.map((t) => `<a href="#t-${t.TABLE_NAME}">${t.TABLE_NAME}</a>`).join('');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${DB} 数据库表结构</title>
<style>
  :root{--bg:#f5f6fa;--card:#fff;--line:#e6e8ee;--text:#1f2430;--muted:#77808f;--primary:#3b6ef6}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font:14px/1.6 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif}
  header{background:linear-gradient(135deg,#3b6ef6,#6f8cff);color:#fff;padding:28px 32px}
  header h1{margin:0 0 6px;font-size:22px}
  header p{margin:0;opacity:.92;font-size:13px}
  nav{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid var(--line);padding:10px 32px;display:flex;gap:8px;flex-wrap:wrap}
  nav a{color:var(--primary);text-decoration:none;border:1px solid #dbe3ff;background:#f2f5ff;padding:4px 10px;border-radius:999px;font-size:12px}
  main{max-width:1200px;margin:22px auto 60px;padding:0 20px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin-bottom:18px;box-shadow:0 1px 2px rgba(20,30,60,.04)}
  .card h2{margin:0 0 4px;font-size:18px}
  .sub{color:var(--muted);font-size:13px;font-weight:400}
  .meta{color:var(--muted);font-size:12px;margin-bottom:12px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
  th{background:#fafbff;color:#4a5262;font-weight:600;white-space:nowrap}
  code{background:#f1f3f9;border-radius:4px;padding:1px 5px;font-size:12px}
  .tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:11px}
  .pk{background:#fff1e6;color:#c26a1a}.uk{background:#e8f7ee;color:#1a8a4a}.idx{background:#eef2ff;color:#3b6ef6}
</style>
</head>
<body>
<header>
  <h1>${DB} · 数据库表结构</h1>
  <p>MySQL 8.4.9 · 127.0.0.1:3306 · 共 ${tbls.length} 张表 · 生成时间 ${new Date().toLocaleString('zh-CN')}</p>
</header>
<nav>${nav}</nav>
<main>
${sections}
</main>
</body>
</html>`;

writeFileSync(OUT, html, 'utf8');
console.log(`已生成 ${OUT}：${tbls.length} 张表，${cols.length} 个字段，${idx.length} 个索引`);
