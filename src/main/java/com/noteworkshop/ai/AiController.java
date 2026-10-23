package com.noteworkshop.ai;

import com.noteworkshop.ai.dto.AiGenerateRequest;
import com.noteworkshop.ai.dto.AiSaveRequest;
import com.noteworkshop.ai.dto.ChatRequest;
import com.noteworkshop.common.Result;
import com.noteworkshop.security.UserContext;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Tag(name = "AI 助手", description = "阅读辅助（总结/人群/评分）与智能客服")
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @GetMapping("/status")
    public Result<Map<String, Object>> status() {
        return Result.ok(aiService.status());
    }

    @PostMapping("/notes/{noteId}/generate")
    public Result<Map<String, Object>> generate(@PathVariable Long noteId,
                                                @Valid @RequestBody AiGenerateRequest request) {
        return Result.ok(aiService.generate(UserContext.require(), noteId, request.type()));
    }

    @PostMapping("/notes/{noteId}/save")
    public Result<Map<String, Object>> save(@PathVariable Long noteId,
                                            @Valid @RequestBody AiSaveRequest request) {
        return Result.ok(aiService.save(UserContext.require(), noteId, request.type(), request.content()));
    }

    @GetMapping("/notes/{noteId}")
    public Result<Map<String, Object>> get(@PathVariable Long noteId) {
        return Result.ok(aiService.get(noteId));
    }

    @PostMapping("/chat")
    public Result<Map<String, Object>> chat(@Valid @RequestBody ChatRequest request) {
        return Result.ok(aiService.chat(UserContext.require(), request));
    }

    @GetMapping("/sessions")
    public Result<List<AiChatSession>> sessions() {
        return Result.ok(aiService.sessions(UserContext.require()));
    }

    @GetMapping("/sessions/{id}/messages")
    public Result<List<AiChatMessage>> messages(@PathVariable Long id) {
        return Result.ok(aiService.messages(UserContext.require(), id));
    }

    @DeleteMapping("/sessions/{id}")
    public Result<Void> deleteSession(@PathVariable Long id) {
        aiService.deleteSession(UserContext.require(), id);
        return Result.ok();
    }
}
