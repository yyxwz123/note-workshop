// 生成数据库数据预览 HTML：10 张表的字段与前 20 行数据
// 用法：node scripts/export-db-data-html.mjs
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const MYSQL = 'C:/dev/mysql-8.4.9-winx64/bin/mysql.exe';
const DB = 'note_workshop';
const OUT = 'docs/数据库数据预览.html';

function query(sql) {
  const out = execFileSync(MYSQL, [
    '-u', 'root', '-p123456', '-h', '127.0.0.1',
    '--batch', '--raw', '--default-character-set=utf8mb4',
    DB, '-e', sql,
  ], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  const text = out.toString('utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');
  const lines = text.split('\n');
  if (lines.length <= 1) return { header: [], rows: [] };
  const header = lines[0].split('\t');
  const rows = lines.slice(1).filter(Boolean).map((l) => l.split('\t'));
  return { header, rows };
}

const tables = query("SELECT TABLE_NAME, TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA='" + DB + "' ORDER BY TABLE_NAME").rows;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cut = (s, n = 120) => {
  const t = String(s ?? '');
  return t.length > n ? t.slice(0, n) + '…' : t;
};

const sections = [];
const nav = [];
for (const [name, comment] of tables) {
  const cnt = query(`SELECT COUNT(*) AS c FROM \`${name}\``).rows[0][0];
  const data = query(`SELECT * FROM \`${name}\` LIMIT 20`);
  const head = data.header.map((h) => `<th>${esc(h)}</th>`).join('');
  const body = data.rows.map((r) => '<tr>' + r.map((v) => {
    if (v === 'NULL') return '<td class="null">NULL</td>';
    return `<td>${esc(cut(v))}</td>`;
  }).join('') + '</tr>').join('');
  nav.push(`<a href="#t-${name}">${name}</a>`);
  sections.push(`<section class="card" id="t-${name}">
  <h2>${name} <span class="sub">${esc(comment)}</span></h2>
  <div class="meta">共 ${cnt} 行 · 显示前 ${data.rows.length} 行 · ${data.header.length} 列</div>
  <div class="wrap"><table><thead><tr>${head}</tr></thead><tbody>${body || '<tr><td class="empty" colspan="' + data.header.length + '">（空表）</td></tr>'}</tbody></table></div>
</section>`);
}

const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>note_workshop 数据预览</title>
<style>
 body{margin:0;background:#f5f6fa;color:#1f2430;font:13px/1.6 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif}
 header{background:linear-gradient(135deg,#3b6ef6,#6f8cff);color:#fff;padding:22px 28px}
 header h1{margin:0 0 4px;font-size:20px} header p{margin:0;font-size:12px;opacity:.92}
 nav{position:sticky;top:0;background:#fff;border-bottom:1px solid #e5e8ef;padding:9px 28px;display:flex;gap:6px;flex-wrap:wrap;z-index:5}
 nav a{color:#3b6ef6;text-decoration:none;background:#f2f5ff;border:1px solid #dbe3ff;border-radius:999px;padding:2px 10px;font-size:12px}
 main{max-width:1400px;margin:18px auto 60px;padding:0 18px}
 .card{background:#fff;border:1px solid #e5e8ef;border-radius:12px;padding:16px 18px;margin-bottom:16px}
 .card h2{margin:0 0 4px;font-size:16px} .sub{color:#78808f;font-size:12px;font-weight:400}
 .meta{color:#78808f;font-size:12px;margin-bottom:10px}
 .wrap{overflow:auto;max-height:460px;border:1px solid #eef0f5;border-radius:8px}
 table{border-collapse:collapse;width:100%;font-size:12px}
 th,td{border-bottom:1px solid #eef0f5;padding:5px 8px;text-align:left;vertical-align:top;white-space:nowrap;max-width:420px;overflow:hidden;text-overflow:ellipsis}
 th{position:sticky;top:0;background:#fafbff;color:#4a5262;z-index:1}
 td.null{color:#c0c6d2;font-style:italic}
 td.empty{text-align:center;color:#a0a6b4;padding:20px}
</style></head><body>
<header><h1>note_workshop · 数据预览</h1><p>10 张表 · 每表前 20 行 · 生成时间 ${new Date().toLocaleString('zh-CN')}</p></header>
<nav>${nav.join('')}</nav>
<main>${sections.join('\n')}</main>
</body></html>`;

writeFileSync(OUT, html, 'utf8');
console.log(`已生成 ${OUT}：${tables.length} 张表`);
