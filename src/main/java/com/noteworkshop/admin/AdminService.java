package com.noteworkshop.admin;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.noteworkshop.ai.AiCallLog;
import com.noteworkshop.ai.AiCallLogMapper;
import com.noteworkshop.comment.Comment;
import com.noteworkshop.comment.CommentMapper;
import com.noteworkshop.comment.CommentService;
import com.noteworkshop.common.BizException;
import com.noteworkshop.common.PageResult;
import com.noteworkshop.follow.Follow;
import com.noteworkshop.follow.FollowMapper;
import com.noteworkshop.note.Note;
import com.noteworkshop.note.NoteMapper;
import com.noteworkshop.note.NoteService;
import com.noteworkshop.user.User;
import com.noteworkshop.user.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserMapper userMapper;
    private final NoteMapper noteMapper;
    private final CommentMapper commentMapper;
    private final CommentService commentService;
    private final FollowMapper followMapper;
    private final AiCallLogMapper aiCallLogMapper;

    public Map<String, Object> dashboard() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("userCount", userMapper.selectCount(null));
        map.put("noteCount", noteMapper.selectCount(null));
        map.put("publicNoteCount", noteMapper.selectCount(Wrappers.<Note>lambdaQuery()
                .eq(Note::getIsPublic, 1).eq(Note::getStatus, NoteService.STATUS_NORMAL)));
        map.put("pendingNoteCount", noteMapper.selectCount(Wrappers.<Note>lambdaQuery()
                .eq(Note::getStatus, NoteService.STATUS_PENDING)));
        map.put("commentCount", commentMapper.selectCount(Wrappers.<Comment>lambdaQuery()
                .eq(Comment::getDeleted, 0)));
        map.put("followCount", followMapper.selectCount(null));
        map.put("aiTotal", aiCallLogMapper.selectCount(null));
        map.put("aiSuccess", aiCallLogMapper.selectCount(Wrappers.<AiCallLog>lambdaQuery()
                .eq(AiCallLog::getSuccess, 1)));
        map.put("aiFail", aiCallLogMapper.selectCount(Wrappers.<AiCallLog>lambdaQuery()
                .eq(AiCallLog::getSuccess, 0)));
        return map;
    }

    public PageResult<User> users(long page, long size, String keyword) {
        var query = Wrappers.<User>lambdaQuery().orderByDesc(User::getCreatedAt);
        if (StringUtils.hasText(keyword)) {
            query.and(w -> w.like(User::getUsername, keyword).or().like(User::getNickname, keyword));
        }
        Page<User> p = userMapper.selectPage(new Page<>(page, size), query);
        p.getRecords().forEach(u -> u.setPassword(null));
        return PageResult.of(p);
    }

    @Transactional
    public void setUserStatus(Long userId, Integer status) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BizException(404, "用户不存在");
        }
        if ("ADMIN".equals(user.getRole()) && status != null && status == 0) {
            throw new BizException(400, "不能禁用管理员账号");
        }
        user.setStatus(status);
        userMapper.updateById(user);
    }

    public PageResult<Note> notes(long page, long size, Integer status, String keyword) {
        var query = Wrappers.<Note>lambdaQuery().orderByDesc(Note::getCreatedAt);
        if (status != null) {
            query.eq(Note::getStatus, status);
        }
        if (StringUtils.hasText(keyword)) {
            query.and(w -> w.like(Note::getTitle, keyword).or().like(Note::getBookName, keyword));
        }
        return PageResult.of(noteMapper.selectPage(new Page<>(page, size), query));
    }

    @Transactional
    public void review(Long noteId, boolean approved, String reason) {
        Note note = noteMapper.selectById(noteId);
        if (note == null) {
            throw new BizException(404, "笔记不存在");
        }
        if (note.getStatus() == null || note.getStatus() != NoteService.STATUS_PENDING) {
            throw new BizException(400, "该笔记不在待审核状态");
        }
        note.setStatus(approved ? NoteService.STATUS_NORMAL : NoteService.STATUS_REJECTED);
        note.setRejectReason(approved ? null : (StringUtils.hasText(reason) ? reason : "内容不符合公开规范"));
        note.setReviewedAt(LocalDateTime.now());
        noteMapper.updateById(note);
    }

    @Transactional
    public void takeDown(Long noteId) {
        Note note = noteMapper.selectById(noteId);
        if (note == null) {
            throw new BizException(404, "笔记不存在");
        }
        note.setStatus(NoteService.STATUS_OFFLINE);
        noteMapper.updateById(note);
    }

    public void deleteComment(Long commentId) {
        commentService.adminDelete(commentId);
    }

    public Map<String, Object> aiStats() {
        long total = aiCallLogMapper.selectCount(null);
        long success = aiCallLogMapper.selectCount(Wrappers.<AiCallLog>lambdaQuery()
                .eq(AiCallLog::getSuccess, 1));
        List<Map<String, Object>> rows = aiCallLogMapper.selectMaps(
                Wrappers.<AiCallLog>query()
                        .select("scene", "count(*) as total",
                                "sum(case when success = 1 then 1 else 0 end) as success")
                        .groupBy("scene"));
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("total", total);
        map.put("success", success);
        map.put("fail", total - success);
        map.put("byScene", rows);
        return map;
    }
}
