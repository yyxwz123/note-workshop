package com.noteworkshop.comment;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.noteworkshop.comment.dto.CommentRequest;
import com.noteworkshop.comment.dto.CommentVO;
import com.noteworkshop.common.BizException;
import com.noteworkshop.note.Note;
import com.noteworkshop.note.NoteMapper;
import com.noteworkshop.user.User;
import com.noteworkshop.user.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentMapper commentMapper;
    private final NoteMapper noteMapper;
    private final UserMapper userMapper;

    public List<CommentVO> listByNote(Long noteId) {
        List<Comment> comments = commentMapper.selectList(Wrappers.<Comment>lambdaQuery()
                .eq(Comment::getNoteId, noteId)
                .eq(Comment::getDeleted, 0)
                .orderByAsc(Comment::getId));
        if (comments.isEmpty()) {
            return List.of();
        }
        Map<Long, User> users = userMapper.selectByIds(
                        comments.stream().map(Comment::getUserId).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));

        Map<Long, CommentVO> voMap = new HashMap<>();
        for (Comment c : comments) {
            User u = users.get(c.getUserId());
            voMap.put(c.getId(), CommentVO.of(c.getId(), c.getNoteId(), c.getUserId(),
                    u == null ? "已注销用户" : u.getNickname(),
                    u == null ? null : u.getAvatar(),
                    c.getParentId(), c.getContent(), c.getCreatedAt()));
        }
        List<CommentVO> roots = new ArrayList<>();
        for (Comment c : comments) {
            CommentVO vo = voMap.get(c.getId());
            CommentVO parent = voMap.get(c.getParentId());
            if (c.getParentId() == null || c.getParentId() == 0 || parent == null) {
                roots.add(vo);
            } else {
                parent.children().add(vo);
            }
        }
        return roots;
    }

    @Transactional
    public CommentVO add(Long userId, Long noteId, CommentRequest request) {
        Note note = noteMapper.selectById(noteId);
        if (note == null || note.getStatus() == null || note.getStatus() != 1
                || note.getIsPublic() == null || note.getIsPublic() != 1) {
            throw new BizException(404, "笔记不存在或未公开");
        }
        Long parentId = request.parentId() == null ? 0L : request.parentId();
        if (parentId != 0) {
            Comment parent = commentMapper.selectById(parentId);
            if (parent == null || parent.getDeleted() == 1 || !parent.getNoteId().equals(noteId)) {
                throw new BizException(400, "回复的评论不存在");
            }
        }
        Comment comment = new Comment();
        comment.setNoteId(noteId);
        comment.setUserId(userId);
        comment.setParentId(parentId);
        comment.setContent(request.content());
        comment.setDeleted(0);
        commentMapper.insert(comment);
        noteMapper.update(null, Wrappers.<Note>lambdaUpdate()
                .eq(Note::getId, noteId)
                .setSql("comment_count = comment_count + 1"));

        User user = userMapper.selectById(userId);
        log.info("用户 {} 评论了笔记 {}", userId, noteId);
        return CommentVO.of(comment.getId(), noteId, userId,
                user == null ? "" : user.getNickname(),
                user == null ? null : user.getAvatar(),
                parentId, comment.getContent(), comment.getCreatedAt());
    }

    @Transactional
    public void delete(Long userId, Long commentId) {
        Comment comment = commentMapper.selectById(commentId);
        if (comment == null || comment.getDeleted() == 1) {
            throw new BizException(404, "评论不存在");
        }
        if (!comment.getUserId().equals(userId)) {
            throw new BizException(403, "只能删除自己的评论");
        }
        removeCascade(comment);
    }

    @Transactional
    public void adminDelete(Long commentId) {
        Comment comment = commentMapper.selectById(commentId);
        if (comment == null || comment.getDeleted() == 1) {
            throw new BizException(404, "评论不存在");
        }
        removeCascade(comment);
        log.info("管理员删除评论 {}", commentId);
    }

    /** 逻辑删除该评论及其所有子孙评论 */
    private void removeCascade(Comment root) {
        List<Comment> all = commentMapper.selectList(Wrappers.<Comment>lambdaQuery()
                .eq(Comment::getNoteId, root.getNoteId())
                .eq(Comment::getDeleted, 0));
        Map<Long, List<Comment>> childrenMap = all.stream()
                .collect(Collectors.groupingBy(c -> c.getParentId() == null ? 0L : c.getParentId()));

        Set<Long> toDelete = new HashSet<>();
        Deque<Long> queue = new ArrayDeque<>();
        queue.add(root.getId());
        toDelete.add(root.getId());
        while (!queue.isEmpty()) {
            Long current = queue.poll();
            for (Comment child : childrenMap.getOrDefault(current, List.of())) {
                if (toDelete.add(child.getId())) {
                    queue.add(child.getId());
                }
            }
        }
        commentMapper.update(null, Wrappers.<Comment>lambdaUpdate()
                .in(Comment::getId, toDelete)
                .set(Comment::getDeleted, 1));
        noteMapper.update(null, Wrappers.<Note>lambdaUpdate()
                .eq(Note::getId, root.getNoteId())
                .setSql("comment_count = GREATEST(comment_count - " + toDelete.size() + ", 0)"));
    }
}
