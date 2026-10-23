package com.noteworkshop.comment;

import com.noteworkshop.comment.dto.CommentRequest;
import com.noteworkshop.comment.dto.CommentVO;
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

@Tag(name = "评论", description = "评论、二级回复、删除")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping("/public/notes/{noteId}/comments")
    public Result<List<CommentVO>> list(@PathVariable Long noteId) {
        return Result.ok(commentService.listByNote(noteId));
    }

    @PostMapping("/notes/{noteId}/comments")
    public Result<CommentVO> add(@PathVariable Long noteId, @Valid @RequestBody CommentRequest request) {
        return Result.ok(commentService.add(UserContext.require(), noteId, request));
    }

    @DeleteMapping("/comments/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        commentService.delete(UserContext.require(), id);
        return Result.ok();
    }
}
