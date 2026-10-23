package com.noteworkshop.note;

import com.noteworkshop.common.PageResult;
import com.noteworkshop.common.Result;
import com.noteworkshop.note.dto.NoteDetail;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "公开接口", description = "无需登录的笔记浏览接口")
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final NoteService noteService;

    @GetMapping("/health")
    public Result<Map<String, String>> health() {
        return Result.ok(Map.of("status", "UP"));
    }

    @GetMapping("/notes")
    public Result<PageResult<Note>> notes(@RequestParam(defaultValue = "1") long page,
                                          @RequestParam(defaultValue = "10") long size,
                                          @RequestParam(defaultValue = "latest") String sort) {
        return Result.ok(noteService.listPublic(page, size, sort));
    }

    @GetMapping("/notes/{id}")
    public Result<NoteDetail> detail(@PathVariable Long id) {
        return Result.ok(noteService.detail(id, null));
    }

    @GetMapping("/users/{id}/notes")
    public Result<PageResult<Note>> authorNotes(@PathVariable Long id,
                                                @RequestParam(defaultValue = "1") long page,
                                                @RequestParam(defaultValue = "10") long size) {
        return Result.ok(noteService.listPublicByAuthor(id, page, size));
    }
}
