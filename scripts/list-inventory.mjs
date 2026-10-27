// 生成项目清单：接口用例、数据表、REST 接口
// 用法：node scripts/list-inventory.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import yaml from 'js-yaml';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8080';

// ---------- 1. 接口用例 ----------
const testSrc = readFileSync('scripts/api-test.mjs', 'utf8');
const tests = [...testSrc.matchAll(/await t\('([^']+)'/g)].map((m) => m[1]);

// ---------- 2. 数据表 ----------
const schema = readFileSync('sql/schema.sql', 'utf8');
const tables = [];
const tableRe = /CREATE TABLE IF NOT EXISTS `?(\w+)`? \(([\s\S]*?)\) ENGINE=([^;]*);/g;
let m;
while ((m = tableRe.exec(schema)) !== null) {
  const name = m[1];
  const body = m[2];
  const tail = m[3];
  const comment = (tail.match(/COMMENT='([^']*)'/) || [])[1] || '';
  const colLines = body.split('\n');
  const firstKey = colLines.findIndex((l) => /^\s*(PRIMARY KEY|UNIQUE KEY|KEY)\b/.test(l));
  const columnBlock = firstKey === -1 ? colLines : colLines.slice(0, firstKey);
  const columns = columnBlock.filter((l) => /^\s{2}`?\w+`?\s+(bigint|int|tinyint|smallint|varchar|char|text|datetime|timestamp|decimal|json)\b/i.test(l)).length;
  const keys = [...body.matchAll(/^\s*(UNIQUE KEY|KEY|PRIMARY KEY)\s*`?(\w+)`?\s*\(([^)]*)\)/gm)]
    .map((k) => `${k[1]} ${k[2]}(${k[3].replace(/`/g, '')})`);
  tables.push({ name, comment, columns, keys });
}

// ---------- 3. REST 接口 ----------
const spec = await (await fetch(`${BASE}/v3/api-docs`)).json();
const summaries = {};
if (existsSync('docs/openapi.yaml')) {
  const doc = yaml.load(readFileSync('docs/openapi.yaml', 'utf8'));
  for (const [p, item] of Object.entries(doc.paths || {})) {
    for (const [method, op] of Object.entries(item)) {
      if (op && op.summary) summaries[`${method.toUpperCase()} ${p}`] = op.summary;
    }
  }
}
const ops = [];
for (const [path, item] of Object.entries(spec.paths || {})) {
  for (const [method, op] of Object.entries(item)) {
    if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue;
    const tag = (op.tags && op.tags[0]) || '未分组';
    const auth = path.startsWith('/api/public') || path.startsWith('/api/auth') || path === '/api/health'
      ? '公开'
      : path.startsWith('/api/admin')
        ? 'ADMIN'
        : '登录';
    const key = `${method.toUpperCase()} ${path}`;
    ops.push({ method: method.toUpperCase(), path, tag, summary: summaries[key] || op.summary || '', auth });
  }
}
const TAG_ORDER = ['认证与用户', '笔记', '公开接口', '评论', '关注与作者', '管理后台', 'AI 助手', '文件上传'];
ops.sort((a, b) => {
  const ta = TAG_ORDER.indexOf(a.tag);
  const tb = TAG_ORDER.indexOf(b.tag);
  if (ta !== tb) return (ta === -1 ? 99 : ta) - (tb === -1 ? 99 : tb);
  return a.path.localeCompare(b.path) || a.method.localeCompare(b.method);
});

// ---------- 输出 ----------
const lines = [];
lines.push('# 项目清单：56 个用例 · 10 张表 · 42 个接口', '');
lines.push('> 自动生成：`node scripts/list-inventory.mjs`');
lines.push(`> 数据来源：\`scripts/api-test.mjs\`、\`sql/schema.sql\`、\`${BASE}/v3/api-docs\``, '');
lines.push(`统计：**${tests.length}** 个接口用例、**${tables.length}** 张表、**${ops.length}** 个接口。`, '');

lines.push(`## 一、接口用例（${tests.length} 个）`, '');
lines.push('| # | 用例 | # | 用例 |');
lines.push('| --- | --- | --- | --- |');
for (let i = 0; i < tests.length; i += 2) {
  const a = tests[i];
  const b = tests[i + 1] || '';
  lines.push(`| ${i + 1} | ${a} | ${b ? i + 2 : ''} | ${b} |`);
}
lines.push('');

lines.push(`## 二、数据表（${tables.length} 张）`, '');
lines.push('| # | 表名 | 说明 | 字段数 | 主键 / 索引 |');
lines.push('| --- | --- | --- | --- | --- |');
tables.forEach((t, i) => {
  lines.push(`| ${i + 1} | \`${t.name}\` | ${t.comment} | ${t.columns} | ${t.keys.join('<br>')} |`);
});
lines.push('');

lines.push(`## 三、REST 接口（${ops.length} 个）`, '');
lines.push('| # | 分组 | 方法 | 路径 | 说明 | 鉴权 |');
lines.push('| --- | --- | --- | --- | --- | --- |');
ops.forEach((o, i) => {
  lines.push(`| ${i + 1} | ${o.tag} | ${o.method} | \`${o.path}\` | ${o.summary} | ${o.auth} |`);
});
lines.push('');

mkdirSync('docs', { recursive: true });
writeFileSync('docs/项目清单.md', lines.join('\n'), 'utf8');
console.log(`已生成 docs/项目清单.md：${tests.length} 用例 / ${tables.length} 表 / ${ops.length} 接口`);
