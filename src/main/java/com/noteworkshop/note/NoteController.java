package com.noteworkshop.note;

import com.noteworkshop.common.PageResult;
import com.noteworkshop.common.Result;
import com.noteworkshop.note.dto.NoteDetail;
import com.noteworkshop.note.dto.NoteRequest;
import com.noteworkshop.security.UserContext;
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

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    @PostMapping
    public Result<NoteDetail> create(@Valid @RequestBody NoteRequest request) {
        return Result.ok(noteService.create(UserContext.require(), request));
    }

    @PutMapping("/{id}")
    public Result<NoteDetail> update(@PathVariable Long id, @Valid @RequestBody NoteRequest request) {
        return Result.ok(noteService.update(UserContext.require(), id, request));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        noteService.delete(UserContext.require(), id);
        return Result.ok();
    }

    @GetMapping("/mine")
    public Result<PageResult<Note>> mine(@RequestParam(defaultValue = "1") long page,
                                         @RequestParam(defaultValue = "10") long size) {
        return Result.ok(noteService.listMine(UserContext.require(), page, size));
    }

    @GetMapping("/liked")
    public Result<PageResult<Note>> liked(@RequestParam(defaultValue = "1") long page,
                                          @RequestParam(defaultValue = "10") long size) {
        return Result.ok(noteService.listLiked(UserContext.require(), page, size));
    }

    @GetMapping("/{id}")
    public Result<NoteDetail> detail(@PathVariable Long id) {
        return Result.ok(noteService.detail(id, UserContext.get()));
    }

    @PostMapping("/{id}/like")
    public Result<Map<String, Object>> like(@PathVariable Long id) {
        return Result.ok(noteService.toggleLike(UserContext.require(), id));
    }
}
