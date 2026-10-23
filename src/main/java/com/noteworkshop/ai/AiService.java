package com.noteworkshop.ai;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.noteworkshop.ai.dto.ChatRequest;
import com.noteworkshop.common.BizException;
import com.noteworkshop.note.Note;
import com.noteworkshop.note.NoteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    private static final String NOTE_SYSTEM_PROMPT =
            "你是「笔记工坊」的读书笔记助手，输出使用简体中文，只依据用户给出的笔记内容作答，不要编造。";

    private final ChatClient.Builder chatClientBuilder;
    private final AiProperties aiProperties;
    private final NoteAiMapper noteAiMapper;
    private final AiCallLogMapper callLogMapper;
    private final AiChatSessionMapper sessionMapper;
    private final AiChatMessageMapper messageMapper;
    private final NoteService noteService;

    private volatile ChatClient chatClient;

    private ChatClient client() {
        if (chatClient == null) {
            synchronized (this) {
                if (chatClient == null) {
                    chatClient = chatClientBuilder.build();
                }
            }
        }
        return chatClient;
    }

    public Map<String, Object> status() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("enabled", aiProperties.isEnabled());
        map.put("scenes", List.of("SUMMARY", "AUDIENCE", "SCORE", "CHAT"));
        map.put("note", "需要配置环境变量 AI_API_KEY / AI_BASE_URL / AI_MODEL 后才能真正调用大模型");
        return map;
    }

    public Map<String, Object> generate(Long userId, Long noteId, String type) {
        ensureEnabled();
        Note note = noteService.requireOwned(userId, noteId);
        String prompt = buildNotePrompt(note, type);
        long start = System.currentTimeMillis();
        try {
            String content = callAi(NOTE_SYSTEM_PROMPT, prompt);
            logCall(userId, type, true, null, System.currentTimeMillis() - start);
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("type", type);
            map.put("content", content);
            map.put("saved", false);
            return map;
        } catch (Exception e) {
            logCall(userId, type, false, e.getMessage(), System.currentTimeMillis() - start);
            log.warn("AI 调用失败 type={} noteId={}", type, noteId, e);
            throw new BizException(503, "AI 服务暂不可用：" + brief(e.getMessage()));
        }
    }

    @Transactional
    public Map<String, Object> save(Long userId, Long noteId, String type, String content) {
        noteService.requireOwned(userId, noteId);
        NoteAi existing = noteAiMapper.selectOne(Wrappers.<NoteAi>lambdaQuery()
                .eq(NoteAi::getNoteId, noteId).last("limit 1"));
        if (existing == null) {
            NoteAi ai = new NoteAi();
            ai.setNoteId(noteId);
            ai.setType(type);
            ai.setContent(content);
            noteAiMapper.insert(ai);
        } else {
            existing.setType(type);
            existing.setContent(content);
            noteAiMapper.updateById(existing);
        }
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("type", type);
        map.put("content", content);
        map.put("saved", true);
        return map;
    }

    public Map<String, Object> get(Long noteId) {
        NoteAi ai = noteAiMapper.selectOne(Wrappers.<NoteAi>lambdaQuery()
                .eq(NoteAi::getNoteId, noteId).last("limit 1"));
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("type", ai == null ? null : ai.getType());
        map.put("content", ai == null ? null : ai.getContent());
        map.put("savedAt", ai == null ? null : ai.getCreatedAt());
        return map;
    }

    /**
     * 不加事务：AI 调用失败时，用户消息与调用日志需要保留（日志用于统计失败次数）
     */
    public Map<String, Object> chat(Long userId, ChatRequest request) {
        ensureEnabled();
        AiChatSession session;
        if (request.sessionId() == null) {
            session = new AiChatSession();
            session.setUserId(userId);
            session.setTitle(shortTitle(request.message()));
            sessionMapper.insert(session);
        } else {
            session = requireSession(userId, request.sessionId());
        }

        List<AiChatMessage> history = messageMapper.selectList(Wrappers.<AiChatMessage>lambdaQuery()
                .eq(AiChatMessage::getSessionId, session.getId())
                .orderByDesc(AiChatMessage::getId)
                .last("limit " + aiProperties.getWindowSize()));
        Collections.reverse(history);

        AiChatMessage userMessage = new AiChatMessage();
        userMessage.setSessionId(session.getId());
        userMessage.setRole("user");
        userMessage.setContent(request.message());
        messageMapper.insert(userMessage);

        String prompt = buildChatPrompt(history, request.message());
        long start = System.currentTimeMillis();
        String reply;
        try {
            reply = callAi(aiProperties.getSystemPrompt(), prompt);
            logCall(userId, "CHAT", true, null, System.currentTimeMillis() - start);
        } catch (Exception e) {
            logCall(userId, "CHAT", false, e.getMessage(), System.currentTimeMillis() - start);
            log.warn("AI 客服调用失败 sessionId={}", session.getId(), e);
            throw new BizException(503, "AI 服务暂不可用：" + brief(e.getMessage()));
        }

        AiChatMessage assistantMessage = new AiChatMessage();
        assistantMessage.setSessionId(session.getId());
        assistantMessage.setRole("assistant");
        assistantMessage.setContent(reply);
        messageMapper.insert(assistantMessage);

        session.setUpdatedAt(LocalDateTime.now());
        sessionMapper.updateById(session);

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("sessionId", session.getId());
        map.put("title", session.getTitle());
        map.put("reply", reply);
        return map;
    }

    public List<AiChatSession> sessions(Long userId) {
        return sessionMapper.selectList(Wrappers.<AiChatSession>lambdaQuery()
                .eq(AiChatSession::getUserId, userId)
                .orderByDesc(AiChatSession::getUpdatedAt)
                .orderByDesc(AiChatSession::getId));
    }

    public List<AiChatMessage> messages(Long userId, Long sessionId) {
        requireSession(userId, sessionId);
        return messageMapper.selectList(Wrappers.<AiChatMessage>lambdaQuery()
                .eq(AiChatMessage::getSessionId, sessionId)
                .orderByAsc(AiChatMessage::getId));
    }

    @Transactional
    public void deleteSession(Long userId, Long sessionId) {
        requireSession(userId, sessionId);
        messageMapper.delete(Wrappers.<AiChatMessage>lambdaQuery()
                .eq(AiChatMessage::getSessionId, sessionId));
        sessionMapper.deleteById(sessionId);
    }

    private AiChatSession requireSession(Long userId, Long sessionId) {
        AiChatSession session = sessionMapper.selectById(sessionId);
        if (session == null) {
            throw new BizException(404, "会话不存在");
        }
        if (!session.getUserId().equals(userId)) {
            throw new BizException(403, "无权访问他人的会话");
        }
        return session;
    }

    private String callAi(String system, String user) {
        return client().prompt()
                .system(system)
                .user(user)
                .call()
                .content();
    }

    private String buildNotePrompt(Note note, String type) {
        String body = "书名：" + note.getBookName() + "\n标题：" + note.getTitle() + "\n正文：\n" + note.getContent();
        return switch (type) {
            case "SUMMARY" -> "请阅读下面的读书笔记，用不超过 200 字总结核心内容与要点，直接输出总结正文。\n\n" + body;
            case "AUDIENCE" -> "请根据下面的读书笔记，推荐 3 类最适合阅读它的人群，并分别说明理由。\n\n" + body;
            case "SCORE" -> "请从「内容完整性」「整体相关性」「思考深度」三个维度给下面的读书笔记打分（每项 10 分），"
                    + "给出总分（30 分制）和一句改进建议。\n\n" + body;
            default -> throw new BizException(400, "不支持的 AI 类型");
        };
    }

    private String buildChatPrompt(List<AiChatMessage> history, String message) {
        StringBuilder sb = new StringBuilder();
        if (!history.isEmpty()) {
            sb.append("以下是本会话最近的历史对话，请结合上下文回答最后一个问题：\n");
            for (AiChatMessage m : history) {
                sb.append("user".equals(m.getRole()) ? "用户：" : "助手：")
                        .append(m.getContent()).append('\n');
            }
            sb.append('\n');
        }
        sb.append("用户：").append(message);
        return sb.toString();
    }

    private void ensureEnabled() {
        if (!aiProperties.isEnabled()) {
            throw new BizException(503, "AI 功能未启用（设置 AI_ENABLED=true 并配置 AI_API_KEY）");
        }
    }

    private void logCall(Long userId, String scene, boolean success, String error, long latency) {
        try {
            AiCallLog log = new AiCallLog();
            log.setUserId(userId);
            log.setScene(scene);
            log.setSuccess(success ? 1 : 0);
            log.setErrorMsg(error == null ? null : brief(error));
            log.setLatencyMs((int) Math.min(latency, Integer.MAX_VALUE));
            callLogMapper.insert(log);
        } catch (Exception e) {
            log.warn("写入 AI 调用日志失败", e);
        }
    }

    private String brief(String text) {
        if (!StringUtils.hasText(text)) {
            return "未知错误";
        }
        return text.length() <= 240 ? text : text.substring(0, 240);
    }

    private String shortTitle(String message) {
        String t = message.replaceAll("\\s+", " ").trim();
        return t.length() <= 20 ? t : t.substring(0, 20);
    }
}
