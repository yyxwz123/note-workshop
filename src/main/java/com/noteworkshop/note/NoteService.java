package com.noteworkshop.note;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.noteworkshop.common.BizException;
import com.noteworkshop.common.PageResult;
import com.noteworkshop.note.dto.NoteDetail;
import com.noteworkshop.note.dto.NoteRequest;
import com.noteworkshop.user.User;
import com.noteworkshop.user.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NoteService {

    private final NoteMapper noteMapper;
    private final NoteImageMapper imageMapper;
    private final NoteLikeMapper likeMapper;
    private final UserMapper userMapper;

    @Transactional
    public NoteDetail create(Long userId, NoteRequest request) {
        Note note = new Note();
        note.setUserId(userId);
        note.setBookName(request.bookName());
        note.setTitle(request.title());
        note.setContent(request.content());
        note.setIsPublic(request.isPublic() == null ? 0 : request.isPublic());
        note.setStatus(1);
        note.setLikeCount(0);
        note.setCommentCount(0);
        noteMapper.insert(note);
        saveImages(note.getId(), request.images());
        return detail(note.getId(), userId);
    }

    @Transactional
    public NoteDetail update(Long userId, Long noteId, NoteRequest request) {
        Note note = requireOwned(userId, noteId);
        note.setBookName(request.bookName());
        note.setTitle(request.title());
        note.setContent(request.content());
        note.setIsPublic(request.isPublic() == null ? 0 : request.isPublic());
        noteMapper.updateById(note);
        imageMapper.delete(Wrappers.<NoteImage>lambdaQuery().eq(NoteImage::getNoteId, noteId));
        saveImages(noteId, request.images());
        return detail(noteId, userId);
    }

    @Transactional
    public void delete(Long userId, Long noteId) {
        requireOwned(userId, noteId);
        noteMapper.deleteById(noteId);
        imageMapper.delete(Wrappers.<NoteImage>lambdaQuery().eq(NoteImage::getNoteId, noteId));
        likeMapper.delete(Wrappers.<NoteLike>lambdaQuery().eq(NoteLike::getNoteId, noteId));
    }

    public PageResult<Note> listMine(Long userId, long page, long size) {
        Page<Note> p = noteMapper.selectPage(new Page<>(page, size),
                Wrappers.<Note>lambdaQuery()
                        .eq(Note::getUserId, userId)
                        .orderByDesc(Note::getCreatedAt));
        return PageResult.of(p);
    }

    public PageResult<Note> listPublic(long page, long size, String sort) {
        var query = Wrappers.<Note>lambdaQuery()
                .eq(Note::getIsPublic, 1)
                .eq(Note::getStatus, 1);
        if ("hot".equalsIgnoreCase(sort)) {
            query.orderByDesc(Note::getLikeCount).orderByDesc(Note::getCreatedAt);
        } else {
            query.orderByDesc(Note::getCreatedAt);
        }
        Page<Note> p = noteMapper.selectPage(new Page<>(page, size), query);
        attachAuthors(p.getRecords());
        return PageResult.of(p);
    }

    public NoteDetail detail(Long noteId, Long currentUserId) {
        Note note = noteMapper.selectById(noteId);
        if (note == null || (note.getStatus() != null && note.getStatus() == 0)) {
            throw new BizException(404, "笔记不存在");
        }
        boolean isPublic = note.getIsPublic() != null && note.getIsPublic() == 1;
        if (!isPublic && (currentUserId == null || !currentUserId.equals(note.getUserId()))) {
            throw new BizException(403, "该笔记为私有笔记");
        }
        List<String> images = imageUrls(noteId);
        boolean liked = currentUserId != null && likeMapper.selectCount(
                Wrappers.<NoteLike>lambdaQuery()
                        .eq(NoteLike::getUserId, currentUserId)
                        .eq(NoteLike::getNoteId, noteId)) > 0;
        note.setImages(images);
        note.setLiked(liked);
        attachAuthor(note);
        return new NoteDetail(note, images, liked);
    }

    @Transactional
    public Map<String, Object> toggleLike(Long userId, Long noteId) {
        Note note = noteMapper.selectById(noteId);
        if (note == null) {
            throw new BizException(404, "笔记不存在");
        }
        if (note.getIsPublic() == null || note.getIsPublic() != 1 || note.getStatus() == null || note.getStatus() != 1) {
            throw new BizException(400, "只能点赞公开笔记");
        }
        Long exists = likeMapper.selectCount(Wrappers.<NoteLike>lambdaQuery()
                .eq(NoteLike::getUserId, userId)
                .eq(NoteLike::getNoteId, noteId));
        boolean liked;
        if (exists > 0) {
            likeMapper.delete(Wrappers.<NoteLike>lambdaQuery()
                    .eq(NoteLike::getUserId, userId)
                    .eq(NoteLike::getNoteId, noteId));
            noteMapper.update(null, Wrappers.<Note>lambdaUpdate()
                    .eq(Note::getId, noteId)
                    .setSql("like_count = GREATEST(like_count - 1, 0)"));
            liked = false;
        } else {
            NoteLike like = new NoteLike();
            like.setUserId(userId);
            like.setNoteId(noteId);
            likeMapper.insert(like);
            noteMapper.update(null, Wrappers.<Note>lambdaUpdate()
                    .eq(Note::getId, noteId)
                    .setSql("like_count = like_count + 1"));
            liked = true;
        }
        Note latest = noteMapper.selectById(noteId);
        return Map.of("liked", liked, "likeCount", latest.getLikeCount());
    }

    public PageResult<Note> listLiked(Long userId, long page, long size) {
        IPage<NoteLike> likePage = likeMapper.selectPage(new Page<>(page, size),
                Wrappers.<NoteLike>lambdaQuery()
                        .eq(NoteLike::getUserId, userId)
                        .orderByDesc(NoteLike::getCreatedAt));
        if (CollectionUtils.isEmpty(likePage.getRecords())) {
            return PageResult.of(Collections.emptyList(), 0, page, size);
        }
        List<Long> noteIds = likePage.getRecords().stream().map(NoteLike::getNoteId).toList();
        Map<Long, Note> noteMap = noteMapper.selectByIds(noteIds).stream()
                .collect(Collectors.toMap(Note::getId, Function.identity()));
        List<Note> notes = noteIds.stream()
                .map(noteMap::get)
                .filter(java.util.Objects::nonNull)
                .toList();
        attachAuthors(notes);
        return PageResult.of(notes, likePage.getTotal(), page, size);
    }

    private Note requireOwned(Long userId, Long noteId) {
        Note note = noteMapper.selectById(noteId);
        if (note == null) {
            throw new BizException(404, "笔记不存在");
        }
        if (!note.getUserId().equals(userId)) {
            throw new BizException(403, "无权操作他人的笔记");
        }
        return note;
    }

    private void saveImages(Long noteId, List<String> urls) {
        if (CollectionUtils.isEmpty(urls)) {
            return;
        }
        int sort = 0;
        for (String url : urls) {
            NoteImage image = new NoteImage();
            image.setNoteId(noteId);
            image.setUrl(url);
            image.setSort(sort++);
            imageMapper.insert(image);
        }
    }

    private List<String> imageUrls(Long noteId) {
        return imageMapper.selectList(Wrappers.<NoteImage>lambdaQuery()
                        .eq(NoteImage::getNoteId, noteId)
                        .orderByAsc(NoteImage::getSort))
                .stream().map(NoteImage::getUrl).toList();
    }

    private void attachAuthors(List<Note> notes) {
        if (CollectionUtils.isEmpty(notes)) {
            return;
        }
        List<Long> userIds = notes.stream().map(Note::getUserId).distinct().toList();
        Map<Long, User> users = userMapper.selectByIds(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        for (Note note : notes) {
            User author = users.get(note.getUserId());
            if (author != null) {
                note.setAuthorName(author.getNickname());
                note.setAuthorAvatar(author.getAvatar());
            }
        }
    }

    private void attachAuthor(Note note) {
        User author = userMapper.selectById(note.getUserId());
        if (author != null) {
            note.setAuthorName(author.getNickname());
            note.setAuthorAvatar(author.getAvatar());
        }
    }
}
