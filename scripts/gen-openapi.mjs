// 从运行中的后端拉取 OpenAPI，补全中文 summary / 唯一 operationId，生成 Apifox 可导入的 YAML
// 用法：node scripts/gen-openapi.mjs [baseUrl]
import { writeFileSync, mkdirSync } from 'node:fs';
import yaml from 'js-yaml';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';

const OPS = {
  'GET /api/users/me': ['当前用户信息', 'getCurrentUser'],
  'PUT /api/users/me': ['修改个人资料', 'updateProfile'],
  'GET /api/notes/{id}': ['笔记详情', 'getNoteDetail'],
  'PUT /api/notes/{id}': ['编辑笔记', 'updateNote'],
  'DELETE /api/notes/{id}': ['删除笔记', 'deleteNote'],
  'PUT /api/admin/users/{id}/status': ['启用/禁用用户', 'setUserStatus'],
  'PUT /api/admin/notes/{id}/take-down': ['下架笔记', 'takeDownNote'],
  'POST /api/users/{id}/follow': ['关注用户', 'followUser'],
  'DELETE /api/users/{id}/follow': ['取消关注', 'unfollowUser'],
  'POST /api/notes': ['新建笔记', 'createNote'],
  'POST /api/notes/{noteId}/comments': ['发表评论/回复', 'addComment'],
  'POST /api/notes/{id}/like': ['点赞/取消点赞', 'toggleLike'],
  'POST /api/files/upload': ['上传图片', 'uploadFile'],
  'POST /api/auth/register': ['注册', 'register'],
  'POST /api/auth/login': ['登录', 'login'],
  'POST /api/ai/notes/{noteId}/save': ['保存 AI 结果到笔记', 'saveAiResult'],
  'POST /api/ai/notes/{noteId}/generate': ['AI 生成（总结/人群/评分）', 'generateAi'],
  'POST /api/ai/chat': ['AI 客服对话', 'chatWithAi'],
  'POST /api/admin/notes/{id}/review': ['审核笔记', 'reviewNote'],
  'GET /api/users/{id}/following': ['关注列表', 'listFollowing'],
  'GET /api/users/{id}/followers': ['粉丝列表', 'listFollowers'],
  'GET /api/public/users/{id}': ['作者主页信息', 'getAuthorProfile'],
  'GET /api/public/users/{id}/notes': ['作者的公开笔记', 'listAuthorNotes'],
  'GET /api/public/notes': ['公开笔记流', 'listPublicNotes'],
  'GET /api/public/notes/{noteId}/comments': ['笔记评论树', 'listComments'],
  'GET /api/public/notes/{id}': ['公开笔记详情', 'getPublicNote'],
  'GET /api/public/health': ['健康检查', 'health'],
  'GET /api/public/authors/hot': ['热门作者榜', 'listHotAuthors'],
  'GET /api/notes/mine': ['我的笔记', 'listMyNotes'],
  'GET /api/notes/liked': ['我点赞的笔记', 'listLikedNotes'],
  'GET /api/ai/status': ['AI 功能状态', 'aiStatus'],
  'GET /api/ai/sessions': ['AI 会话列表', 'listAiSessions'],
  'GET /api/ai/sessions/{id}/messages': ['会话消息记录', 'listAiMessages'],
  'GET /api/ai/notes/{noteId}': ['查询笔记的 AI 结果', 'getAiResult'],
  'GET /api/admin/users': ['用户列表', 'listUsers'],
  'GET /api/admin/notes': ['笔记列表（可筛选状态）', 'listAllNotes'],
  'GET /api/admin/notes/pending': ['待审核笔记', 'listPendingNotes'],
  'GET /api/admin/dashboard': ['后台数据概览', 'adminDashboard'],
  'GET /api/admin/ai/stats': ['AI 调用统计', 'aiStats'],
  'DELETE /api/comments/{id}': ['删除自己的评论', 'deleteComment'],
  'DELETE /api/ai/sessions/{id}': ['删除会话', 'deleteAiSession'],
  'DELETE /api/admin/comments/{id}': ['管理员删除评论', 'adminDeleteComment'],
};

const TAG_DESCRIPTIONS = {
  认证与用户: '注册、登录、个人资料',
  笔记: '笔记增删改查、我的笔记、点赞',
  公开接口: '无需登录的浏览接口',
  评论: '评论、二级回复、删除',
  关注与作者: '关注/取关、粉丝、热门作者',
  管理后台: '用户管理、笔记审核与下架、评论管理、AI 统计',
  'AI 助手': '阅读辅助（总结/人群/评分）与智能客服',
  文件上传: '头像、笔记配图上传',
};

const res = await fetch(`${BASE}/v3/api-docs.yaml`);
if (!res.ok) throw new Error(`拉取 OpenAPI 失败: HTTP ${res.status}`);
const spec = yaml.load(await res.text());

let n = 0;
for (const [path, ops] of Object.entries(spec.paths || {})) {
  for (const [method, op] of Object.entries(ops)) {
    const key = `${method.toUpperCase()} ${path}`;
    const hit = OPS[key];
    if (hit) {
      op.summary = hit[0];
      op.operationId = hit[1];
      n++;
    } else {
      op.summary = op.summary || `${method.toUpperCase()} ${path}`;
      op.operationId = op.operationId || `${method}${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
  }
}

spec.info = {
  ...spec.info,
  title: '笔记工坊 Note-Workshop API',
  version: '1.0.0',
  description: [
    '面向在校学生的读书笔记社区后端接口（V1 全功能）。',
    '',
    '- 统一响应：`{ code, message, data }`，`code=0` 成功；401 未登录、403 无权限、404 不存在、503 AI 未配置',
    '- 鉴权：除 `/api/auth/**`、`/api/public/**` 外需 `Authorization: Bearer <token>`',
    '- 管理接口 `/api/admin/**` 需要 ADMIN 角色（默认账号 admin / admin123）',
  ].join('\n'),
};
spec.servers = [{ url: 'http://127.0.0.1:8080', description: '本地开发环境' }];

const usedTags = new Set();
for (const ops of Object.values(spec.paths || {})) {
  for (const op of Object.values(ops)) {
    (op.tags || []).forEach((t) => usedTags.add(t));
  }
}
spec.tags = [...usedTags].map((name) => ({ name, description: TAG_DESCRIPTIONS[name] || '' }));

mkdirSync('docs', { recursive: true });
writeFileSync('docs/openapi.yaml', yaml.dump(spec, { lineWidth: 120, noRefs: true }), 'utf8');
console.log(`已生成 docs/openapi.yaml：${Object.keys(spec.paths).length} 个路径，42 个操作中补全 ${n} 个 summary`);
