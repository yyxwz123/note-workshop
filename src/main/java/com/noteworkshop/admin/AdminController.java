package com.noteworkshop.admin;

import com.noteworkshop.admin.dto.ReviewRequest;
import com.noteworkshop.common.PageResult;
import com.noteworkshop.common.Result;
import com.noteworkshop.note.Note;
import com.noteworkshop.user.User;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "管理后台", description = "用户管理、笔记审核与下架、评论管理、AI 统计")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/dashboard")
    public Result<Map<String, Object>> dashboard() {
        return Result.ok(adminService.dashboard());
    }

    @GetMapping("/users")
    public Result<PageResult<User>> users(@RequestParam(defaultValue = "1") long page,
                                          @RequestParam(defaultValue = "10") long size,
                                          @RequestParam(required = false) String keyword) {
        return Result.ok(adminService.users(page, size, keyword));
    }

    @PutMapping("/users/{id}/status")
    public Result<Void> setUserStatus(@PathVariable Long id, @RequestParam Integer status) {
        adminService.setUserStatus(id, status);
        return Result.ok();
    }

    @GetMapping("/notes")
    public Result<PageResult<Note>> notes(@RequestParam(defaultValue = "1") long page,
                                          @RequestParam(defaultValue = "10") long size,
                                          @RequestParam(required = false) Integer status,
                                          @RequestParam(required = false) String keyword) {
        return Result.ok(adminService.notes(page, size, status, keyword));
    }

    @GetMapping("/notes/pending")
    public Result<PageResult<Note>> pending(@RequestParam(defaultValue = "1") long page,
                                            @RequestParam(defaultValue = "10") long size) {
        return Result.ok(adminService.notes(page, size, 2, null));
    }

    @PostMapping("/notes/{id}/review")
    public Result<Void> review(@PathVariable Long id, @Valid @RequestBody ReviewRequest request) {
        adminService.review(id, request.approved(), request.reason());
        return Result.ok();
    }

    @PutMapping("/notes/{id}/take-down")
    public Result<Void> takeDown(@PathVariable Long id) {
        adminService.takeDown(id);
        return Result.ok();
    }

    @DeleteMapping("/comments/{id}")
    public Result<Void> deleteComment(@PathVariable Long id) {
        adminService.deleteComment(id);
        return Result.ok();
    }

    @GetMapping("/ai/stats")
    public Result<Map<String, Object>> aiStats() {
        return Result.ok(adminService.aiStats());
    }
}
