package com.noteworkshop.follow;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.noteworkshop.common.BizException;
import com.noteworkshop.common.PageResult;
import com.noteworkshop.follow.dto.AuthorVO;
import com.noteworkshop.note.Note;
import com.noteworkshop.note.NoteMapper;
import com.noteworkshop.user.User;
import com.noteworkshop.user.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowMapper followMapper;
    private final UserMapper userMapper;
    private final NoteMapper noteMapper;

    @Transactional
    public Map<String, Object> follow(Long userId, Long targetId) {
        if (userId.equals(targetId)) {
            throw new BizException("不能关注自己");
        }
        User target = userMapper.selectById(targetId);
        if (target == null) {
            throw new BizException(404, "用户不存在");
        }
        Long exists = followMapper.selectCount(Wrappers.<Follow>lambdaQuery()
                .eq(Follow::getFollowerId, userId)
                .eq(Follow::getFolloweeId, targetId));
        if (exists == null || exists == 0) {
            Follow follow = new Follow();
            follow.setFollowerId(userId);
            follow.setFolloweeId(targetId);
            followMapper.insert(follow);
        }
        return Map.of("followed", true, "fansCount", fansCount(targetId));
    }

    @Transactional
    public Map<String, Object> unfollow(Long userId, Long targetId) {
        followMapper.delete(Wrappers.<Follow>lambdaQuery()
                .eq(Follow::getFollowerId, userId)
                .eq(Follow::getFolloweeId, targetId));
        return Map.of("followed", false, "fansCount", fansCount(targetId));
    }

    public long fansCount(Long userId) {
        return followMapper.selectCount(Wrappers.<Follow>lambdaQuery()
                .eq(Follow::getFolloweeId, userId));
    }

    public PageResult<User> followers(Long targetId, long page, long size) {
        Page<Follow> p = followMapper.selectPage(new Page<>(page, size),
                Wrappers.<Follow>lambdaQuery()
                        .eq(Follow::getFolloweeId, targetId)
                        .orderByDesc(Follow::getCreatedAt));
        return toUsers(p, Follow::getFollowerId, page, size);
    }

    public PageResult<User> following(Long userId, long page, long size) {
        Page<Follow> p = followMapper.selectPage(new Page<>(page, size),
                Wrappers.<Follow>lambdaQuery()
                        .eq(Follow::getFollowerId, userId)
                        .orderByDesc(Follow::getCreatedAt));
        return toUsers(p, Follow::getFolloweeId, page, size);
    }

    public AuthorVO profile(Long targetId, Long currentUserId) {
        User user = userMapper.selectById(targetId);
        if (user == null) {
            throw new BizException(404, "用户不存在");
        }
        long notes = noteMapper.selectCount(Wrappers.<Note>lambdaQuery()
                .eq(Note::getUserId, targetId)
                .eq(Note::getIsPublic, 1)
                .eq(Note::getStatus, 1));
        boolean followed = currentUserId != null && followMapper.selectCount(
                Wrappers.<Follow>lambdaQuery()
                        .eq(Follow::getFollowerId, currentUserId)
                        .eq(Follow::getFolloweeId, targetId)) > 0;
        return new AuthorVO(user.getId(), user.getNickname(), user.getAvatar(), user.getBio(),
                fansCount(targetId), notes, followed);
    }

    /** 热门作者：按粉丝数倒序 */
    public List<AuthorVO> hotAuthors(int limit) {
        List<Map<String, Object>> rows = followMapper.selectMaps(
                Wrappers.<Follow>query()
                        .select("followee_id", "count(*) as cnt")
                        .groupBy("followee_id")
                        .orderByDesc("cnt")
                        .last("limit " + Math.max(1, Math.min(limit, 50))));
        if (rows.isEmpty()) {
            return List.of();
        }
        List<Long> ids = rows.stream()
                .map(r -> ((Number) r.get("followee_id")).longValue())
                .toList();
        Map<Long, User> users = userMapper.selectByIds(ids).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        List<AuthorVO> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Long id = ((Number) row.get("followee_id")).longValue();
            User u = users.get(id);
            if (u == null) {
                continue;
            }
            result.add(new AuthorVO(u.getId(), u.getNickname(), u.getAvatar(), u.getBio(),
                    ((Number) row.get("cnt")).longValue(),
                    noteMapper.selectCount(Wrappers.<Note>lambdaQuery()
                            .eq(Note::getUserId, id)
                            .eq(Note::getIsPublic, 1)
                            .eq(Note::getStatus, 1)),
                    false));
        }
        return result;
    }

    private PageResult<User> toUsers(Page<Follow> p, Function<Follow, Long> idGetter, long page, long size) {
        if (p.getRecords().isEmpty()) {
            return PageResult.of(List.of(), p.getTotal(), page, size);
        }
        List<Long> ids = p.getRecords().stream().map(idGetter).toList();
        Map<Long, User> users = userMapper.selectByIds(ids).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        List<User> ordered = ids.stream()
                .map(users::get)
                .filter(java.util.Objects::nonNull)
                .peek(u -> u.setPassword(null))
                .toList();
        return PageResult.of(ordered, p.getTotal(), page, size);
    }
}
